"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReceiptActionsProps = {
  id: string;
  archived: boolean;
};

export function ReceiptActions({ id, archived }: ReceiptActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(
    action: "reprocess" | "archive" | "restore" | "delete",
  ) {
    if (
      action === "delete" &&
      !window.confirm(
        "Permanently delete this receipt and its stored file? This cannot be undone.",
      )
    ) {
      return;
    }

    setBusy(action);
    setMessage("");

    try {
      let response: Response;

      if (action === "reprocess") {
        response = await fetch(`/api/receipts/${id}/reprocess`, {
          method: "POST",
        });
      } else if (action === "restore") {
        response = await fetch(`/api/receipts/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore" }),
        });
      } else {
        response = await fetch(
          `/api/receipts/${id}?mode=${
            action === "delete" ? "permanent" : "archive"
          }`,
          { method: "DELETE" },
        );
      }

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Action failed.");
      }

      if (action === "delete") {
        router.push("/receipts");
        return;
      }

      setMessage(
        action === "reprocess"
          ? "AI extraction completed."
          : action === "archive"
            ? "Receipt archived."
            : "Receipt restored.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          Actions
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">
          Receipt workflow
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-sky-100 px-4 py-2 text-sm font-black text-sky-950 disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => run("reprocess")}
          type="button"
        >
          {busy === "reprocess" ? "Reprocessing..." : "Reprocess with AI"}
        </button>
        {archived ? (
          <button
            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-950 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => run("restore")}
            type="button"
          >
            Restore
          </button>
        ) : (
          <button
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-800 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => run("archive")}
            type="button"
          >
            Archive
          </button>
        )}
        <button
          className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-black text-rose-950 disabled:opacity-50"
          disabled={busy !== null}
          onClick={() => run("delete")}
          type="button"
        >
          Permanently delete
        </button>
      </div>
      {message ? (
        <p className="text-sm font-bold text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}
