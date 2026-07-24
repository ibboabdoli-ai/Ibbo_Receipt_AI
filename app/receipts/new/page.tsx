"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type UploadState =
  | "idle"
  | "preparing"
  | "processing"
  | "success"
  | "error";

async function compressImage(file: File) {
  if (!file.type.startsWith("image/") || file.size < 2 * 1024 * 1024) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );

    if (!blob || blob.size >= file.size) return file;

    const fileName = file.name.replace(/\.[^.]+$/, "") || "receipt";
    return new File([blob], `${fileName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function uploadReceipt() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a receipt image or PDF first.");
      return;
    }

    setExistingId(null);
    setStatus("preparing");
    setMessage("Preparing the document...");

    try {
      const preparedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", preparedFile);
      formData.append("notes", notes);

      setStatus("processing");
      setMessage("Uploading securely and extracting bookkeeping fields...");

      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        receipt?: { id?: string };
        existing_id?: string;
      };

      if (response.status === 409 && data.existing_id) {
        setStatus("error");
        setExistingId(data.existing_id);
        setMessage(
          data.error ||
            "This exact file has already been uploaded. Open the existing receipt.",
        );
        return;
      }

      if (!response.ok || !data.ok || !data.receipt?.id) {
        throw new Error(data.error || "Failed to process the receipt.");
      }

      setStatus("success");
      setMessage("Receipt saved. Opening the review page...");
      router.push(`/receipts/${data.receipt.id}`);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not upload the receipt.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          Upload
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Scan a receipt or invoice
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Use the phone camera, choose an image, or upload a PDF. Large images
          are compressed in the browser before being stored privately.
        </p>
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-black text-slate-700">
              Receipt image or PDF
            </span>
            <input
              accept="image/*,application/pdf"
              capture="environment"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setStatus("idle");
                setMessage("");
                setExistingId(null);
              }}
              type="file"
            />
            <span className="block text-xs font-semibold text-slate-500">
              Maximum size: 15 MB. Images and PDF documents are supported.
            </span>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-black text-slate-700">Notes</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              maxLength={1000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional context, project, or bookkeeping note"
              value={notes}
            />
          </label>

          <button
            className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={status === "preparing" || status === "processing"}
            onClick={uploadReceipt}
            type="button"
          >
            {status === "preparing"
              ? "Preparing..."
              : status === "processing"
                ? "Reading with AI..."
                : "Upload and process"}
          </button>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Preview</p>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Selected receipt preview"
              className="mt-3 max-h-[420px] w-full rounded-2xl object-contain"
              src={previewUrl}
            />
          ) : file?.type === "application/pdf" ? (
            <div className="mt-3 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
              <p className="text-5xl">PDF</p>
              <p className="mt-3 break-all text-sm font-bold text-slate-700">
                {file.name}
              </p>
            </div>
          ) : (
            <div className="mt-3 grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              The selected document appears here before upload.
            </div>
          )}
          {file ? (
            <div className="mt-4 space-y-1 text-xs font-semibold text-slate-500">
              <p className="break-all">{file.name}</p>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : null}
        </aside>
      </section>

      {message ? (
        <div
          className={
            status === "error"
              ? "rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 ring-1 ring-rose-200"
              : "rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
          }
        >
          <p>{message}</p>
          {existingId ? (
            <Link
              className="mt-3 inline-block underline underline-offset-4"
              href={`/receipts/${existingId}`}
            >
              Open existing receipt
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
