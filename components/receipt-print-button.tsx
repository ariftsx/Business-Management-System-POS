"use client";

import { Printer } from "lucide-react";

export function ReceiptPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition no-print"
    >
      <Printer size={17} />
      <span>Cetak Struk Transaksi</span>
    </button>
  );
}
