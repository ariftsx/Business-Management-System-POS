import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { createClient } from "../../../lib/supabase/server";
import { ReceiptPrintButton } from "../../../components/receipt-print-button";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: transaction }, { data: settings }] = await Promise.all([
    supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        status,
        payment_method,
        subtotal,
        discount,
        total,
        paid_amount,
        change_amount,
        created_at,
        transaction_items (
          product_name,
          quantity,
          selling_price,
          subtotal
        )
      `)
      .eq("id", id)
      .single(),
    supabase.from("business_settings").select("*").eq("id", true).single(),
  ]);

  if (!transaction) notFound();

  const businessName = settings?.business_name || "KTM D-PRINTING";
  const address = settings?.address || "";
  const phone = settings?.phone || "";
  const logoUrl = settings?.logo_url || null;
  const footerNote = settings?.receipt_footer || "Terima kasih telah berbelanja di KTM D-Printing.";

  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(transaction.created_at));

  return (
    <AppShell active="Transaksi">
      <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between no-print">
          <Link
            href="/transaksi"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <ArrowLeft size={17} />
            <span>Kembali ke riwayat transaksi</span>
          </Link>
          <ReceiptPrintButton />
        </div>

        {/* Printable Receipt Card */}
        <section className="receipt-container rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-200 pb-5">
            {logoUrl && (
              <div className="flex justify-center mb-3">
                <Image
                  src={logoUrl}
                  alt={businessName}
                  width={64}
                  height={64}
                  unoptimized
                  className="h-14 w-auto object-contain"
                />
              </div>
            )}
            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {businessName}
            </h2>
            {address && <p className="mt-1 text-xs text-slate-500">{address}</p>}
            {phone && <p className="text-xs text-slate-500">Telp/WA: {phone}</p>}
            <div className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-bold text-slate-600">
              {transaction.transaction_number}
            </div>
            <p className="mt-1 text-xs text-slate-400">{dateFormatted}</p>
          </div>

          {/* Status Badge */}
          <div className="my-4 flex items-center justify-between text-xs">
            <span className="text-slate-500">Status Transaksi</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold ${
                transaction.status === "PAID"
                  ? "bg-green-50 text-green-700"
                  : transaction.status === "PENDING"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {transaction.status === "PAID" ? "✓ LUNAS" : transaction.status}
            </span>
          </div>

          {/* Items List */}
          <div className="border-t border-dashed border-slate-200 py-3 space-y-3">
            {(transaction.transaction_items ?? []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-slate-800">{item.product_name}</p>
                  <p className="text-slate-400">
                    {item.quantity} × {money(Number(item.selling_price))}
                  </p>
                </div>
                <p className="font-bold text-slate-900 shrink-0">
                  {money(Number(item.subtotal))}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{money(Number(transaction.subtotal))}</span>
            </div>
            {Number(transaction.discount || 0) > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Diskon</span>
                <span>-{money(Number(transaction.discount))}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>Total Tagihan</span>
              <span className="text-blue-600">{money(Number(transaction.total))}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Metode Pembayaran</span>
              <span className="font-bold">{transaction.payment_method}</span>
            </div>
            {Number(transaction.paid_amount || 0) > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Jumlah Diterima (Bayar)</span>
                <span>{money(Number(transaction.paid_amount))}</span>
              </div>
            )}
            {Number(transaction.change_amount || 0) > 0 && (
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>Kembalian</span>
                <span className="text-emerald-700">{money(Number(transaction.change_amount))}</span>
              </div>
            )}
          </div>

          {/* Footer Receipt Note */}
          <div className="mt-6 border-t border-dashed border-slate-200 pt-5 text-center text-xs text-slate-400">
            <p className="italic">{footerNote}</p>
            <p className="mt-2 text-[10px] text-slate-300">
              Dicetak via KTM D-Printing POS System
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
