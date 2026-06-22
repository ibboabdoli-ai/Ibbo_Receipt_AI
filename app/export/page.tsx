export default function ExportPage() {
  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Export</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Receipt export</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Download saved receipt data from Turso as a CSV file for spreadsheet review, bokforing preparation, and manual checks.
        </p>
        <a
          className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          href="/api/receipts/export"
        >
          Download CSV
        </a>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-black text-slate-950">Export includes</h2>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
          <li>Receipt date, merchant, amount, currency, category, and type.</li>
          <li>VAT amount, payment method, confidence, status, and notes.</li>
          <li>Image URL and creation timestamp for later review.</li>
        </ul>
      </section>
    </div>
  );
}
