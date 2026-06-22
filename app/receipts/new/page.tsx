"use client";

import { useState } from "react";

export default function NewReceiptPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  async function createTestReceipt() {
    setStatus("loading");
    setMessage("Creating test receipt...");

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          merchant: "ICA Test",
          amount: 149.9,
          currency: "SEK",
          category: "Food",
          expense_type: "private",
          vat_amount: 17.84,
          payment_method: "card",
          notes: "Created from Phase 2C test button",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create receipt");
      }

      setStatus("success");
      setMessage("Test receipt saved in Turso ✅");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Could not save test receipt ❌");
    }
  }

  async function uploadReceiptImage() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a receipt image first ❌");
      return;
    }

    setStatus("loading");
    setMessage("Uploading receipt image...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notes", notes);

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to upload receipt");
      }

      setStatus("success");
      setMessage("Receipt image saved to Blob and Turso ✅");
      setFile(null);
      setNotes("");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Could not upload receipt image ❌");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Upload</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Scan a receipt</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Phase 2F: upload a receipt image to Vercel Blob and save a review row in Turso.
        </p>
      </section>

      <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-950">Real image upload</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This saves the image in Vercel Blob and creates a receipt row with status needs_review.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-black text-slate-700">Receipt image</span>
          <input
            accept="image/*"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-black text-slate-700">Notes</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note before AI extraction is enabled"
            value={notes}
          />
        </label>

        <button
          className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
          onClick={uploadReceiptImage}
          type="button"
        >
          {status === "loading" ? "Uploading..." : "Upload receipt image"}
        </button>
      </section>

      <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-950">Test database save</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This creates one sample receipt through POST /api/receipts.
          </p>
        </div>

        <button
          className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
          onClick={createTestReceipt}
          type="button"
        >
          {status === "loading" ? "Saving..." : "Create test receipt"}
        </button>
      </section>

      {message ? (
        <p
          className={
            status === "error"
              ? "rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200"
              : "rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
          }
        >
          {message}
        </p>
      ) : null}

      <a className="inline-block text-sm font-bold text-emerald-700 underline" href="/receipts">
        View receipts
      </a>
    </div>
  );
}
