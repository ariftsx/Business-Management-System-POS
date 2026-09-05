"use client";

import { ShareExportActions } from "./share-export-actions";

export function ReceiptPrintButton({ transactionNumber }: { transactionNumber?: string }) {
  const filename = transactionNumber ? `Struk_${transactionNumber}` : `Struk_Transaksi_${Date.now()}`;
  return (
    <ShareExportActions
      targetSelector=".receipt-container"
      filename={filename}
      title="Struk Transaksi KTM Digital Printing"
    />
  );
}
