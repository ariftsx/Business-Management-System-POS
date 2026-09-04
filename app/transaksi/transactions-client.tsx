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
} from "lucide-react";
import { AppShell } from "../../components/app-shell";

export type TransactionListItem = {
  id: string;
  transaction_number: string;
  status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
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
      // Query match
      const matchQuery =
        !query.trim() ||
        trx.transaction_number.toLowerCase().includes(query.trim().toLowerCase());

      // Method match
      const matchMethod =
        methodFilter === "SEMUA" || trx.payment_method === methodFilter;

      // Status match
      const matchStatus =
        statusFilter === "SEMUA" || trx.status === statusFilter;

      // Date match
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

  function exportToCSV() {
    const headers = ["No. Transaksi", "Waktu Transaksi", "Metode Pembayaran", "Total (Rp)", "Status"];
    const rows = filtered.map((t) => [
      `"${t.transaction_number}"`,
      `"${new Date(t.created_at).toLocaleString("id-ID")}"`,
      `"${t.payment_method || "-"}"`,
      t.total,
      `"${t.status}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Transaksi_${startDate || "Semua"}_sd_${endDate || "Sekarang"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <AppShell active="Transaksi">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Riwayat Transaksi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cari, filter, export laporan CSV, dan cetak rekap transaksi kasir.
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
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={filtered.length === 0}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Printer size={15} />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* Quick Date Presets Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Pilihan Cepat:</span>
          <button
            onClick={setTodayPreset}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            Hari Ini
          </button>
          <button
            onClick={set7DaysPreset}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={setMonthPreset}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            Bulan Ini
          </button>
        </div>

        {/* Filter controls panel */}
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
              {/* Search query */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Nomor Transaksi
                </label>
                <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs">
                  <Search size={15} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="TRX-2026..."
                    className="w-full bg-transparent outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Payment Method */}
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

              {/* Status */}
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
                      {s === "SEMUA"
                        ? "Semua Status"
                        : s === "PAID"
                        ? "Lunas (Paid)"
                        : s === "PENDING"
                        ? "Pending"
                        : "Batal (Cancelled)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
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

        {/* Transactions Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-bold text-slate-700">
              Menampilkan {filtered.length} transaksi
            </p>
            <p className="text-xs font-semibold text-slate-500">
              Total Nominal: <span className="font-bold text-blue-600">{money(totalFilteredAmount)}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            {filtered.length ? (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                  <tr>
                    <th className="p-4">Nomor Transaksi</th>
                    <th className="p-4">Tanggal & Waktu</th>
                    <th className="p-4">Metode Pembayaran</th>
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
                    ? "Coba sesuaikan kata kunci atau rentang filter Anda."
                    : "Transaksi kasir yang selesai akan tercatat di sini."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
