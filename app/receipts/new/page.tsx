import { receiptCategories } from "../../../lib/receipts";

export default function NewReceiptPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Upload</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Scan a receipt</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Phase 1 UI only: the form is ready for Vercel Blob storage, Turso, and AI extraction, but submission is intentionally disabled until environment variables and API route are connected.
        </p>
      </section>

      <form className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <label className="block">
          <span className="text-sm font-black text-slate-800">Receipt image</span>
          <input
            accept="image/*,application/pdf"
            className="mt-2 block w-full cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
            type="file"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-800">Merchant</span>
            <input className="mt-2 w-full rounded-2xl border-slate-200" placeholder="Maxi ICA Stormarknad" type="text" />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-800">Amount</span>
            <input className="mt-2 w-full rounded-2xl border-slate-200" placeholder="1129" type="number" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-800">Date</span>
            <input className="mt-2 w-full rounded-2xl border-slate-200" type="date" />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-800">Category</span>
            <select className="mt-2 w-full rounded-2xl border-slate-200" defaultValue="Unknown / Needs review">
              {receiptCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-black text-slate-800">Notes</span>
          <textarea className="mt-2 w-full rounded-2xl border-slate-200" placeholder="Optional manual note" rows={4} />
        </label>

        <div className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          <strong>Next step:</strong> connect an API route that uploads the file to Vercel Blob, calls the receipt extraction helper, then inserts a row into the Turso receipts table.
        </div>

        <button
          className="w-full cursor-not-allowed rounded-2xl bg-slate-300 px-5 py-4 font-black text-slate-600"
          disabled
          type="button"
        >
          Processing disabled in Phase 1 baseline
        </button>
      </form>
    </div>
  );
}
