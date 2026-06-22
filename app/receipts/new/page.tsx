"use client";

import { useState } from "react";

export default function NewReceiptPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  async function uploadReceiptImage() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a receipt image first ❌");
      return;
    }

    setStatus("loading");
    setMessage("Uploading and reading receipt with AI...");

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
      setMessage("Receipt saved and processed ✅");
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
          Upload a receipt image. The app stores the file, extracts receipt data with AI, and saves the result in Turso.
        </p>
      </section>

      <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div>
          <h2 className="text-xl font-black text-slate-950">Receipt image upload</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Images are saved in Vercel Blob. Receipt fields are extracted with OpenAI and can be corrected later from the receipt detail page.
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
            placeholder="Optional note for this receipt"
            value={notes}
          />
        </label>

        <button
          className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
          onClick={uploadReceiptImage}
          type="button"
        >
          {status === "loading" ? "Processing..." : "Upload and process receipt"}
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
