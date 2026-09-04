"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Printer,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  Package,
  Layers,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";

export type ReportTransactionItem = {
  product_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  subtotal: number;
};

export type ReportTransaction = {
  id: string;
  transaction_number: string;
  created_at: string;
  payment_method: string;
  total: number;
  items: ReportTransactionItem[];
};

export type ReportExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ReportsClient({
  transactions,
  expenses,
  businessName,
  businessAddress,
  businessPhone,
  logoUrl,
}: {
  transactions: ReportTransaction[];
  expenses: ReportExpense[];
  businessName: string;
  businessAddress: string;
  businessPhone?: string;
  logoUrl?: string | null;
}) {
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const firstDayOfMonth = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

  const [preset, setPreset] = useState<"today" | "7days" | "month" | "all" | "custom">("month");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const handlePreset = (type: "today" | "7days" | "month" | "all") => {
    setPreset(type);
    const curr = new Date();
    const today = toLocalDateStr(curr);
    if (type === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (type === "7days") {
      const d = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - 6);
      setStartDate(toLocalDateStr(d));
      setEndDate(today);
    } else if (type === "month") {
      const d = new Date(curr.getFullYear(), curr.getMonth(), 1);
      setStartDate(toLocalDateStr(d));
      setEndDate(today);
    } else if (type === "all") {
      setStartDate("2020-01-01");
      setEndDate(today);
    }
  };

  // Filter transactions within [startDate, endDate]
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = toLocalDateStr(new Date(t.created_at));
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Filter expenses within [startDate, endDate]
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      return e.expense_date >= startDate && e.expense_date <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Calculations
  const revenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  const cogs = filteredTransactions.reduce((acc, t) => {
    return acc + t.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
  }, 0);
  const grossProfit = revenue - cogs;
  const totalExpense = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpense;
  const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const methods = ["CASH", "TRANSFER", "QRIS", "DANA"];
    return methods.map((m) => {
      const matches = filteredTransactions.filter((t) => t.payment_method === m);
      return {
        method: m,
        count: matches.length,
        total: matches.reduce((acc, t) => acc + t.total, 0),
      };
    });
  }, [filteredTransactions]);

  // Expense category breakdown calculation
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; count: number; total: number }>();
    filteredExpenses.forEach((e) => {
      const cat = e.category || "Operasional";
      const prev = map.get(cat) || { category: cat, count: 0, total: 0 };
      prev.count += 1;
      prev.total += e.amount;
      map.set(cat, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Top products calculation
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const prev = map.get(item.product_name) || {
          name: item.product_name,
          quantity: 0,
          total: 0,
        };
        prev.quantity += item.quantity;
        prev.total += item.subtotal;
        map.set(item.product_name, prev);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredTransactions]);

  // Export CSV function
  const handleExportCSV = () => {
    const headers = ["Nomor Transaksi", "Tanggal", "Jam", "Metode Pembayaran", "Total Transaksi"];
    const rows = filteredTransactions.map((t) => {
      const date = new Date(t.created_at);
      const dateStr = date.toLocaleDateString("id-ID");
      const timeStr = date.toLocaleTimeString("id-ID");
      return [
        `"${t.transaction_number}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${t.payment_method}"`,
        t.total,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan-Penjualan-${startDate}-sd-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell active="Laporan">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        {/* Header Section (Hidden in print) */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end no-print">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Laporan Keuangan & Bisnis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Analisis performa penjualan, laba bersih, dan produk terlaris.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer size={16} />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Date Filters (Hidden in print) */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "today", label: "Hari Ini" },
              { id: "7days", label: "7 Hari Terakhir" },
              { id: "month", label: "Bulan Ini" },
              { id: "all", label: "Semua Waktu" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id as any)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                  preset === p.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rentang:
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("custom");
                }}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("custom");
                }}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-slate-400 sm:ml-auto">
              Menampilkan {filteredTransactions.length} transaksi & {filteredExpenses.length} pengeluaran
            </p>
          </div>
        </section>

        {/* PRINTABLE OFFICIAL EXECUTIVE REPORT (Only visible on window.print) */}
        <div className="hidden print:block font-sans text-black">
          {/* 1. KOP SURAT RESMI */}
          <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-16 object-contain shrink-0"
              />
            )}
            <div className="flex-1">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-950">
                {businessName || "KTM D-PRINTING"}
              </h1>
              <p className="text-xs text-slate-700 leading-relaxed">
                {businessAddress || "Jl. Percetakan Digital No. 8"}
              </p>
              {businessPhone && (
                <p className="text-xs text-slate-700 font-medium">
                  Kontak / WhatsApp: {businessPhone}
                </p>
              )}
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p className="font-bold text-slate-800">DOKUMEN KEUANGAN</p>
              <p>Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="mt-0.5 border-b border-slate-400 mb-6" />

          {/* 2. JUDUL DOKUMEN & PERIODE */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900">
              LAPORAN KEUANGAN & OPERASIONAL BISNIS
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Periode Pembukuan: <span className="font-bold">{startDate}</span> s/d{" "}
              <span className="font-bold">{endDate}</span>
            </p>
          </div>

          {/* 3. TABEL RINGKASAN LABA RUGI (EXECUTIVE P&L) */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              I. Ringkasan Laba Rugi Operasional
            </h3>
            <table className="w-full text-xs border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 font-semibold text-slate-700">1. Total Pendapatan Penjualan (Omzet)</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{money(revenue)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 font-semibold text-slate-700">2. Beban Pokok Penjualan (HPP / Modal Barang)</td>
                  <td className="p-2.5 text-right font-semibold text-slate-800">({money(cogs)})</td>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">
                    3. LABA KOTOR OPERASIONAL
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{money(grossProfit)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 font-semibold text-slate-700">4. Total Beban Operasional & Biaya Lainnya</td>
                  <td className="p-2.5 text-right font-semibold text-slate-800">({money(totalExpense)})</td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td className="p-2.5 text-sm font-black text-slate-950">
                    5. LABA BERSIH (NET PROFIT)
                  </td>
                  <td className="p-2.5 text-right text-sm font-black text-slate-950">
                    {money(netProfit)}
                    <span className="ml-2 text-xs font-normal text-slate-600">
                      ({netMargin}% margin)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. TABEL RINCIAN PENGELUARAN & METODE PEMBAYARAN */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                II. Beban Pengeluaran per Kategori
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <thead className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 text-left">Kategori</th>
                    <th className="p-2 text-center">Jml</th>
                    <th className="p-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {expenseCategoryBreakdown.map((c) => (
                    <tr key={c.category}>
                      <td className="p-2">{c.category}</td>
                      <td className="p-2 text-center">{c.count}</td>
                      <td className="p-2 text-right font-semibold">{money(c.total)}</td>
                    </tr>
                  ))}
                  {expenseCategoryBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-slate-400">Tidak ada data pengeluaran</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                III. Penerimaan per Metode Pembayaran
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <thead className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 text-left">Metode</th>
                    <th className="p-2 text-center">Trx</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paymentBreakdown.map((p) => (
                    <tr key={p.method}>
                      <td className="p-2 font-medium">{p.method}</td>
                      <td className="p-2 text-center">{p.count}</td>
                      <td className="p-2 text-right font-semibold">{money(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. TABEL 10 PRODUK TERLARIS */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
              IV. 10 Produk Penjualan Teratas
            </h3>
            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-2 text-left">No.</th>
                  <th className="p-2 text-left">Nama Produk</th>
                  <th className="p-2 text-center">Volume Terjual</th>
                  <th className="p-2 text-right">Total Nilai Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topProducts.map((prod, idx) => (
                  <tr key={prod.name}>
                    <td className="p-2 text-center w-8">{idx + 1}</td>
                    <td className="p-2 font-medium">{prod.name}</td>
                    <td className="p-2 text-center font-bold">{prod.quantity}</td>
                    <td className="p-2 text-right font-semibold">{money(prod.total)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-400">Tidak ada produk terjual</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 6. LEMBAR PENGESAHAN RESMI (TANDA TANGAN) */}
          <div className="break-inside-avoid grid grid-cols-2 text-center text-xs mt-10 pt-4">
            <div>
              <p className="text-slate-600">Dibuat Oleh,</p>
              <p className="font-semibold text-slate-800 mt-0.5">Kasir / Bagian Keuangan</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">( ........................................ )</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Staf Operasional</p>
            </div>
            <div>
              <p className="text-slate-600">Mengetahui & Menyetujui,</p>
              <p className="font-semibold text-slate-800 mt-0.5">Pimpinan / Pemilik Bisnis</p>
              <div className="h-16" />
              <p className="font-bold underline text-slate-900">( ........................................ )</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Owner / Manager</p>
            </div>
          </div>
        </div>

        {/* SCREEN VIEW (HIDDEN DURING PRINT) */}
        <div className="print:hidden space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ReportCard
              title="Total Omzet"
              subtitle={`${filteredTransactions.length} transaksi selesai`}
              value={money(revenue)}
              color="text-blue-600"
            />
            <ReportCard
              title="Modal Terjual (HPP)"
              subtitle="Harga pokok barang"
              value={money(cogs)}
              color="text-slate-700"
            />
            <ReportCard
              title="Laba Kotor"
              subtitle="Omzet - Modal"
              value={money(grossProfit)}
              color="text-green-600"
            />
            <ReportCard
              title="Total Beban"
              subtitle={`${filteredExpenses.length} pos pengeluaran`}
              value={money(totalExpense)}
              color="text-red-600"
            />
            <ReportCard
              title="Laba Bersih"
              subtitle={`Margin: ${netMargin}%`}
              value={money(netProfit)}
              color={netProfit >= 0 ? "text-emerald-700" : "text-red-700"}
            />
          </div>

          {/* Payment Methods & Top Products Grid */}
          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            {/* Payment Method Distribution */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <FileText className="text-blue-600" size={18} />
                <div>
                  <h3 className="font-bold text-slate-900">Distribusi Metode Pembayaran</h3>
                  <p className="text-xs text-slate-400">Rincian penerimaan kas & digital</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {paymentBreakdown.map((item) => (
                  <div
                    key={item.method}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5"
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-800">{item.method}</span>
                      <p className="text-xs text-slate-400">{item.count} transaksi</p>
                    </div>
                    <p className="font-bold text-sm text-slate-900">{money(item.total)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Top 10 Selling Products */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Package className="text-blue-600" size={18} />
                <div>
                  <h3 className="font-bold text-slate-900">10 Produk Paling Laris</h3>
                  <p className="text-xs text-slate-400">Berdasarkan volume unit terjual di periode ini</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                {topProducts.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 text-xs text-slate-400">
                      <tr>
                        <th className="pb-2">Produk</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-right">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {topProducts.map((p, idx) => (
                        <tr key={p.name} className="hover:bg-slate-50/50">
                          <td className="py-2.5">
                            <span className="mr-2 inline-block w-4 text-xs font-bold text-slate-400">
                              {idx + 1}.
                            </span>
                            <span className="font-medium text-slate-800">{p.name}</span>
                          </td>
                          <td className="py-2.5 text-center font-bold text-blue-600">
                            {p.quantity}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {money(p.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Belum ada produk terjual dalam rentang tanggal ini.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReportCard({
  title,
  subtitle,
  value,
  color,
}: {
  title: string;
  subtitle: string;
  value: string;
  color: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className={`mt-3 text-xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </article>
  );
}
