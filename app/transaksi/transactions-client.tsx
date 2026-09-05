"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Eye,
  Search,
  Filter,
  X,
  Calendar,
  RotateCcw,
  Download,
  Printer,
  ShoppingBag,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { ShareExportActions } from "../../components/share-export-actions";
import * as XLSX from "xlsx";

export type TransactionItem = {
  product_name: string;
  quantity: number;
  selling_price: number;
};

export type TransactionListItem = {
  id: string;
  transaction_number: string;
  status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
  items: TransactionItem[];
};

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const METHODS = ["SEMUA", "CASH", "TRANSFER", "QRIS", "DANA"];
const STATUSES = ["SEMUA", "PAID", "PENDING", "CANCELLED"];

export default function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: TransactionListItem[];
}) {
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("SEMUA");
  const [statusFilter, setStatusFilter] = useState("SEMUA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const setTodayPreset = () => {
    const today = toLocalDateStr(new Date());
    setStartDate(today);
    setEndDate(today);
    setShowFilterPanel(true);
  };
  const set7DaysPreset = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    setStartDate(toLocalDateStr(sevenDaysAgo));
    setEndDate(toLocalDateStr(now));
    setShowFilterPanel(true);
  };
  const setMonthPreset = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(toLocalDateStr(firstDay));
    setEndDate(toLocalDateStr(now));
    setShowFilterPanel(true);
  };

  const filtered = useMemo(() => {
    return initialTransactions.filter((trx) => {
      const matchQuery =
        !query.trim() ||
        trx.transaction_number.toLowerCase().includes(query.trim().toLowerCase()) ||
        trx.items.some((i) => i.product_name.toLowerCase().includes(query.trim().toLowerCase()));
      const matchMethod = methodFilter === "SEMUA" || trx.payment_method === methodFilter;
      const matchStatus = statusFilter === "SEMUA" || trx.status === statusFilter;
      const trxDate = toLocalDateStr(new Date(trx.created_at));
      const matchStartDate = !startDate || trxDate >= startDate;
      const matchEndDate = !endDate || trxDate <= endDate;
      return matchQuery && matchMethod && matchStatus && matchStartDate && matchEndDate;
    });
  }, [initialTransactions, query, methodFilter, statusFilter, startDate, endDate]);

  const totalFilteredAmount = filtered.reduce((acc, t) => acc + t.total, 0);

  const resetFilters = () => {
    setQuery("");
    setMethodFilter("SEMUA");
    setStatusFilter("SEMUA");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    query || methodFilter !== "SEMUA" || statusFilter !== "SEMUA" || startDate || endDate;

  // Export Excel (multi-row per produk)
  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Transaksi
    const summaryHeader = [
      ["REKAP TRANSAKSI KASIR"],
      [`Periode: ${startDate || "Semua"} s/d ${endDate || "Sekarang"}`],
      [`Dicetak: ${new Date().toLocaleString("id-ID")}`],
      [],
      ["No. Transaksi", "Tanggal", "Waktu", "Metode", "Total (Rp)", "Status", "Produk Terjual"],
    ];
    const summaryRows = filtered.map((t) => {
      const d = new Date(t.created_at);
      const productSummary = t.items.map((i) => `${i.product_name} (${i.quantity}x)`).join(", ");
      return [
        t.transaction_number,
        d.toLocaleDateString("id-ID"),
        d.toLocaleTimeString("id-ID"),
        t.payment_method ?? "-",
        t.total,
        t.status,
        productSummary,
      ];
    });
    const summaryFooter = [
      [],
      ["", "", "", "TOTAL", totalFilteredAmount, "", `${filtered.length} transaksi`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ...summaryHeader,
      ...summaryRows,
      ...summaryFooter,
    ]);
    wsSummary["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Rekap Transaksi");

    // Sheet 2: Detail Item per Transaksi
    const detailHeader = [
      ["DETAIL ITEM TRANSAKSI"],
      [],
      ["No. Transaksi", "Tanggal", "Nama Produk", "Qty", "Harga Satuan (Rp)", "Subtotal (Rp)", "Metode", "Status"],
    ];
    const detailRows: any[] = [];
    filtered.forEach((t) => {
      const d = new Date(t.created_at);
      const dateStr = d.toLocaleDateString("id-ID");
      if (t.items.length === 0) {
        detailRows.push([t.transaction_number, dateStr, "-", 0, 0, t.total, t.payment_method ?? "-", t.status]);
      } else {
        t.items.forEach((item) => {
          detailRows.push([
            t.transaction_number,
            dateStr,
            item.product_name,
            item.quantity,
            item.selling_price,
            item.quantity * item.selling_price,
            t.payment_method ?? "-",
            t.status,
          ]);
        });
      }
    });
    const wsDetail = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
    wsDetail["!cols"] = [
      { wch: 20 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Item");

    const filename = `Rekap_Transaksi_${startDate || "Semua"}_sd_${endDate || "Sekarang"}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <AppShell active="Transaksi">
      {/* ============ PRINT VIEW ============ */}
      <div id="rekap-transaksi-print" className="hidden print:block font-sans text-black text-xs p-4 bg-white">
        <div className="mb-4 border-b-2 border-black pb-3">
          <h1 className="text-lg font-black uppercase tracking-wide">Rekap Riwayat Transaksi</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Periode: <strong>{startDate || "Semua Waktu"}</strong> s/d{" "}
            <strong>{endDate || "Sekarang"}</strong>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Dicetak: {new Date().toLocaleString("id-ID")} · Total: {filtered.length} transaksi ·{" "}
            Nominal: {money(totalFilteredAmount)}
          </p>
        </div>
        <table className="w-full text-[10px] border border-gray-400 border-collapse">
          <thead className="bg-gray-100 font-bold">
            <tr>
              <th className="border border-gray-400 p-1.5 text-left">No. Transaksi</th>
              <th className="border border-gray-400 p-1.5 text-left">Tanggal & Waktu</th>
              <th className="border border-gray-400 p-1.5 text-left">Produk Terjual</th>
              <th className="border border-gray-400 p-1.5 text-left">Metode</th>
              <th className="border border-gray-400 p-1.5 text-right">Total</th>
              <th className="border border-gray-400 p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const d = new Date(t.created_at);
              const dateStr = new Intl.DateTimeFormat("id-ID", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              }).format(d);
              return (
                <tr key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 p-1.5 font-bold">{t.transaction_number}</td>
                  <td className="border border-gray-300 p-1.5">{dateStr}</td>
                  <td className="border border-gray-300 p-1.5">
                    {t.items.length > 0
                      ? t.items.map((i) => `${i.product_name} (${i.quantity}x)`).join(", ")
                      : "-"}
                  </td>
                  <td className="border border-gray-300 p-1.5">{t.payment_method ?? "-"}</td>
                  <td className="border border-gray-300 p-1.5 text-right font-bold">
                    {money(t.total)}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center">
                    {t.status === "PAID" ? "✓ Lunas" : t.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-200 font-bold">
            <tr>
              <td colSpan={4} className="border border-gray-400 p-1.5 font-black">
                TOTAL ({filtered.length} Transaksi)
              </td>
              <td className="border border-gray-400 p-1.5 text-right font-black">
                {money(totalFilteredAmount)}
              </td>
              <td className="border border-gray-400 p-1.5" />
            </tr>
          </tfoot>
        </table>
        <p className="mt-4 text-[9px] text-gray-400 text-center">
          Dokumen ini dicetak otomatis oleh sistem POS · {new Date().toLocaleDateString("id-ID")}
        </p>
      </div>

      {/* ============ SCREEN VIEW ============ */}
      <div className="print:hidden mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Riwayat Transaksi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cari, filter, export laporan, dan cetak rekap transaksi kasir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold transition shadow-xs ${
                showFilterPanel || hasActiveFilters
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={15} />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="ml-0.5 h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>
            <button
              onClick={exportToExcel}
              disabled={filtered.length === 0}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>
            <ShareExportActions
              targetSelector="#rekap-transaksi-print"
              filename={`Rekap_Transaksi_${startDate || "Semua"}`}
              title="Rekap Riwayat Transaksi KTM Digital Printing"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Pilihan Cepat:</span>
          {[
            { label: "Hari Ini", action: setTodayPreset },
            { label: "7 Hari Terakhir", action: set7DaysPreset },
            { label: "Bulan Ini", action: setMonthPreset },
          ].map((p) => (
            <button
              key={p.label}
              onClick={p.action}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filter Panel */}
        {(showFilterPanel || hasActiveFilters) && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Filter & Pencarian
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Cari No. Transaksi / Produk
                </label>
                <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs">
                  <Search size={15} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="TRX-2026 atau nama produk..."
                    className="w-full bg-transparent outline-none text-slate-800"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m === "SEMUA" ? "Semua Metode" : m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Status Transaksi
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "SEMUA" ? "Semua Status" : s === "PAID" ? "✓ Lunas" : s === "PENDING" ? "Pending" : "Dibatalkan"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Rentang Tanggal
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-10 rounded-lg border border-slate-200 px-2 text-[11px] outline-none"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-10 rounded-lg border border-slate-200 px-2 text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-bold text-slate-700">
            {filtered.length} transaksi ditemukan
          </p>
          <p className="text-xs font-semibold text-slate-500">
            Total Nominal:{" "}
            <span className="font-bold text-blue-600">{money(totalFilteredAmount)}</span>
          </p>
        </div>

        {/* ===== DESKTOP TABLE ===== */}
        <section className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {filtered.length ? (
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-400">
                  <tr>
                    <th className="p-4">No. Transaksi</th>
                    <th className="p-4">Tanggal & Waktu</th>
                    <th className="p-4">Produk Terjual</th>
                    <th className="p-4">Metode</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((transaction) => {
                    const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(transaction.created_at));

                    return (
                      <tr key={transaction.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <Link
                            href={`/transaksi/${transaction.id}`}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            {transaction.transaction_number}
                          </Link>
                        </td>
                        <td className="p-4 text-xs text-slate-500">{dateFormatted}</td>
                        <td className="p-4 max-w-[240px]">
                          {transaction.items.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {transaction.items.slice(0, 2).map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-xs text-slate-700">
                                  <ShoppingBag size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{item.product_name}</span>
                                  <span className="shrink-0 font-semibold text-slate-500">×{item.quantity}</span>
                                </span>
                              ))}
                              {transaction.items.length > 2 && (
                                <span className="text-[11px] text-slate-400">
                                  +{transaction.items.length - 2} produk lainnya
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {transaction.payment_method ?? "-"}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          {money(Number(transaction.total))}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              transaction.status === "PAID"
                                ? "bg-green-50 text-green-700"
                                : transaction.status === "PENDING"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {transaction.status === "PAID" ? "✓ Lunas" : transaction.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/transaksi/${transaction.id}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Eye size={14} />
                            <span>Detail</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-16 text-center">
                <ClipboardList size={36} className="mx-auto text-slate-300" />
                <p className="mt-4 font-bold text-slate-600">Tidak ada transaksi ditemukan</p>
                <p className="mt-1 text-sm text-slate-400">
                  {hasActiveFilters
                    ? "Coba sesuaikan kata kunci atau rentang filter."
                    : "Transaksi kasir yang selesai akan tercatat di sini."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ===== MOBILE CARD LIST ===== */}
        <section className="sm:hidden space-y-3">
          {filtered.length ? (
            filtered.map((transaction) => {
              const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(transaction.created_at));

              return (
                <div
                  key={transaction.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/transaksi/${transaction.id}`}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        {transaction.transaction_number}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{dateFormatted}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        transaction.status === "PAID"
                          ? "bg-green-50 text-green-700"
                          : transaction.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {transaction.status === "PAID" ? "✓ Lunas" : transaction.status}
                    </span>
                  </div>

                  {/* Products */}
                  {transaction.items.length > 0 && (
                    <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-2.5">
                      {transaction.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-700 min-w-0">
                            <ShoppingBag size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">{item.product_name}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-slate-600 ml-2">×{item.quantity}</span>
                        </div>
                      ))}
                      {transaction.items.length > 3 && (
                        <p className="text-[11px] text-slate-400">
                          +{transaction.items.length - 3} produk lainnya
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bottom row */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {transaction.payment_method ?? "-"}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {money(transaction.total)}
                      </span>
                    </div>
                    <Link
                      href={`/transaksi/${transaction.id}`}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <Eye size={13} />
                      <span>Detail</span>
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <ClipboardList size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 font-bold text-slate-600">Tidak ada transaksi ditemukan</p>
              <p className="mt-1 text-sm text-slate-400">
                {hasActiveFilters ? "Coba sesuaikan filter." : "Belum ada transaksi tercatat."}
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
