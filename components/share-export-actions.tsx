"use client";

import { useState } from "react";
import { Printer, Share2, LoaderCircle } from "lucide-react";
import { shareElementAsFile } from "../lib/share";


type ShareExportActionsProps = {
  targetSelector?: string; // CSS selector e.g. '.receipt-container'
  targetElement?: HTMLElement | null; // direct element reference
  filename: string;
  title: string;
  showPrint?: boolean;
  showShare?: boolean;
  className?: string;
};

export function ShareExportActions({
  targetSelector,
  targetElement,
  filename,
  title,
  showPrint = true,
  showShare = true,
  className = "",
}: ShareExportActionsProps) {
  const [loading, setLoading] = useState<"share" | null>(null);

  function getTargetElement(): HTMLElement | null {
    if (targetElement) return targetElement;
    if (targetSelector) return document.querySelector<HTMLElement>(targetSelector);
    return null;
  }

  async function handleShare() {
    const el = getTargetElement();
    if (!el) {
      alert("Elemen dokumen/struk tidak ditemukan.");
      return;
    }
    try {
      setLoading("share");
      await shareElementAsFile(el, filename, title, "image");
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setLoading(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 no-print ${className}`}>
      {showShare && (
        <button
          type="button"
          onClick={handleShare}
          disabled={loading !== null}
          className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-60"
          title="Bagikan langsung ke WhatsApp, Telegram, atau Aplikasi lain"
        >
          {loading === "share" ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Share2 size={15} />
          )}
          <span>Bagikan</span>
        </button>
      )}

      {showPrint && (
        <button
          type="button"
          onClick={handlePrint}
          className="flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          title="Cetak dokumen / Simpan sebagai PDF"
        >
          <Printer size={15} />
          <span>Cetak</span>
        </button>
      )}
    </div>
  );
}
