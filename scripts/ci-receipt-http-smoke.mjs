import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { createClient } from '@libsql/client';

const root=mkdtempSync(join(tmpdir(),'receipt-local-fixtures-'));
const dbFile=join(root,'fixture.sqlite');
const username='ci-fixture-user', password='CI_ONLY_NEVER_A_REAL_ACCOUNT';
const authorization='Basic '+Buffer.from(username+':'+password).toString('base64');
const port=await new Promise((done,fail)=>{
  const s=createServer();
  s.on('error',fail);
  s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>done(p));});
});
const env={
  ...process.env,
  NODE_ENV:'production',
  NEXT_TELEMETRY_DISABLED:'1',
  TURSO_DATABASE_URL:'file:'+dbFile,
  TURSO_AUTH_TOKEN:'CI_DUMMY_NO_REMOTE_ACCESS',
  OPENAI_API_KEY:'',
  BLOB_READ_WRITE_TOKEN:'',
  GITHUB_TOKEN:'',
  GH_TOKEN:'',
  APP_BASIC_AUTH_USERNAME:username,
  APP_BASIC_AUTH_PASSWORD_SHA256:createHash('sha256').update(password).digest('hex'),
};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
  env,stdio:['ignore','pipe','pipe']
});
let output='';
for(const stream of [server.stdout,server.stderr]){
  stream.on('data',buf=>{output=(output+String(buf)).slice(-2000);});
}
const url='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const headers={authorization};
async function get(path,extra={}){return fetch(url+path,{redirect:'manual',signal:AbortSignal.timeout(12000),...extra});}
let count=0,db;
function verify(title,result){assert.ok(result,title);count++;console.log('PASS: '+title);}
try{
  let ready=false;
  for(let i=0;i<90;i++){
    if(server.exitCode!==null)throw new Error('Next server exited: '+output);
    try{const r=await get('/api/health');if(r.status===401){ready=true;break;}}catch{}
    await sleep(400);
  }
  if(!ready)throw new Error('Next server not ready: '+output);
  let r=await get('/');
  verify('anonymous dashboard blocked',r.status===401);
  verify('auth response is private/no-store',/no-store/.test(r.headers.get('cache-control')||''));
  verify('frame protection',r.headers.get('x-frame-options')==='DENY');
  r=await get('/api/receipts');
  verify('anonymous receipt API blocked',r.status===401);
  r=await get('/api/receipts/export-clean');
  verify('anonymous export blocked',r.status===401);
  r=await get('/api/health',{headers:{authorization:'Basic '+Buffer.from(username+':incorrect').toString('base64')}});
  verify('incorrect password rejected',r.status===401);
  r=await get('/api/health',{headers});
  const health=await r.json();
  verify('login with synthetic override succeeds',r.status===200&&health.ok===true);
  verify('local SQLite ready with zero documents',health.database==='connected'&&health.receipts===0);
  verify('AI and Blob remain disconnected',!health.openaiConfigured&&!health.blobConfigured&&health.authOverrideConfigured);

  db=createClient({url:'file:'+dbFile});
  const sample=[
    ['ci-approved','=SUM(1,1) FAKE VENDOR',125,'SEK',125,'approved',null,null],
    ['ci-pending','FAKE PENDING',37,'SEK',37,'pending',null,null],
    ['ci-archived','FAKE ARCHIVED',50,'SEK',50,'approved','2026-10-18T00:00:00Z',null],
    ['ci-duplicate','FAKE DUPLICATE',125,'SEK',125,'approved',null,'ci-approved'],
    ['ci-foreign','FAKE FOREIGN',20,'EUR',null,'approved',null,null],
  ];
  for(const [id,merchant,amount,currency,sek,approval,archived,duplicate] of sample){
    await db.execute({
      sql:'INSERT INTO receipts (id,date,merchant,amount,currency,amount_sek,category,expense_type,approval_status,status,archived_at,duplicate_of,vat_amount,deductible_vat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      args:[id,'2026-10-18',merchant,amount,currency,sek,'Software','business',approval,'processed',archived,duplicate,25,25]
    });
  }
  r=await get('/api/health',{headers});
  verify('five synthetic records only',(await r.json()).receipts===5);
  r=await get('/api/receipts',{headers});const list=await r.json();
  verify('active list excludes archive',r.status===200&&list.total===4);
  verify('all returned records are fixtures',list.receipts.every(x=>String(x.id).startsWith('ci-')));
  r=await get('/api/receipts?archive=archived',{headers});const archived=await r.json();
  verify('archive filter isolates archived row',archived.total===1&&archived.receipts[0].id==='ci-archived');
  r=await get('/api/receipts?q=%25%27%20OR%201%3D1%20--',{headers});
  verify('SQL-style filter cannot return all rows',r.status===200&&(await r.json()).total===0);
  r=await get('/api/receipts/export-clean',{headers});const csv=await r.text();
  verify('CSV endpoint succeeds',r.status===200&&String(r.headers.get('content-type')).includes('text/csv'));
  verify('clean export excludes pending/archived/duplicate',
    csv.includes('ci-approved')&&csv.includes('ci-foreign')&&!csv.includes('ci-pending')&&!csv.includes('ci-archived')&&!csv.includes('ci-duplicate'));
  verify('CSV spreadsheet formulas escaped',csv.includes("'=SUM(1,1) FAKE VENDOR"));
  r=await get('/api/receipts/export-sie',{headers});const sie=await r.text();
  verify('SIE export includes only eligible SEK row',r.status===200&&sie.includes('#VER')&&sie.includes('FAKE VENDOR')&&!sie.includes('FAKE FOREIGN')&&!sie.includes('FAKE DUPLICATE'));
  r=await get('/receipts',{headers});const html=await r.text();
  verify('authenticated receipt page renders',r.status===200&&html.includes('Searchable receipt register'));
  r=await get('/api/receipts',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{}'});
  verify('invalid upload rejected without storage',r.status===415);
  console.log('PASS: '+count+' isolated integration/security assertions.');
}finally{
  if(db&&typeof db.close==='function'){try{db.close();}catch{}}
  server.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>server.once('exit',resolve)),sleep(3000)]);
  if(server.exitCode===null)server.kill('SIGKILL');
  rmSync(root,{recursive:true,force:true});
}
