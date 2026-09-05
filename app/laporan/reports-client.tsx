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
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { ShareExportActions } from "../../components/share-export-actions";
import * as XLSX from "xlsx";

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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = toLocalDateStr(new Date(t.created_at));
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      return e.expense_date >= startDate && e.expense_date <= endDate;
    });
  }, [expenses, startDate, endDate]);

  const revenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  const cogs = filteredTransactions.reduce((acc, t) => {
    return acc + t.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
  }, 0);
  const grossProfit = revenue - cogs;

  const operationalExpense = filteredExpenses
    .filter((e) => e.category !== "Bahan Baku & Material")
    .reduce((acc, e) => acc + e.amount, 0);

  const materialStockExpense = filteredExpenses
    .filter((e) => e.category === "Bahan Baku & Material")
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpense = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - operationalExpense;
  const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
  const netCashflow = revenue - totalExpense;

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

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const prev = map.get(item.product_name) || { name: item.product_name, quantity: 0, total: 0 };
        prev.quantity += item.quantity;
        prev.total += item.subtotal;
        map.set(item.product_name, prev);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filteredTransactions]);

  // ==== Export Excel (4 sheets) ====
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = `${startDate} s/d ${endDate}`;
    const printDate = new Date().toLocaleString("id-ID");

    // Sheet 1: Ringkasan Keuangan (P&L)
    const wsSum = XLSX.utils.aoa_to_sheet([
      [`LAPORAN KEUANGAN - ${(businessName || "").toUpperCase()}`],
      [`Periode: ${periodLabel}`],
      [`Dicetak: ${printDate}`],
      [],
      ["LAPORAN LABA RUGI OPERASIONAL"],
      ["Keterangan", "Nominal (Rp)"],
      ["1. Total Pendapatan Penjualan (Omzet)", revenue],
      ["2. Beban Pokok Penjualan / HPP", -cogs],
      ["3. Laba Kotor", grossProfit],
      ["4. Beban Operasional Toko", -operationalExpense],
      ["5. LABA BERSIH OPERASIONAL", netProfit],
      ["   Margin Laba Bersih (%)", `${netMargin}%`],
      [],
      ["ARUS KAS"],
      ["Total Kas Masuk (Omzet)", revenue],
      ["Total Kas Keluar (Pengeluaran)", -totalExpense],
      ["Arus Kas Riil Bersih", netCashflow],
      [],
      ["STATISTIK TRANSAKSI"],
      ["Total Transaksi", filteredTransactions.length],
      ["Total Pengeluaran", filteredExpenses.length],
    ]);
    wsSum["!cols"] = [{ wch: 42 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSum, "Ringkasan Keuangan");

    // Sheet 2: Rincian Transaksi
    const wsTrx = XLSX.utils.aoa_to_sheet([
      [`RINCIAN TRANSAKSI - Periode: ${periodLabel}`],
      [],
      ["No. Transaksi", "Tanggal", "Jam", "Metode Pembayaran", "Total (Rp)"],
      ...filteredTransactions.map((t) => {
        const d = new Date(t.created_at);
        return [
          t.transaction_number,
          d.toLocaleDateString("id-ID"),
          d.toLocaleTimeString("id-ID"),
          t.payment_method,
          t.total,
        ];
      }),
      [],
      ["", "", "", "TOTAL", revenue, `${filteredTransactions.length} transaksi`],
    ]);
    wsTrx["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsTrx, "Rincian Transaksi");

    // Sheet 3: Rincian Pengeluaran
    const wsExp = XLSX.utils.aoa_to_sheet([
      [`RINCIAN PENGELUARAN - Periode: ${periodLabel}`],
      [],
      ["Tanggal", "Kategori", "Deskripsi", "Metode", "Nominal (Rp)"],
      ...filteredExpenses.map((e) => [
        e.expense_date,
        e.category,
        e.description,
        e.payment_method,
        e.amount,
      ]),
      [],
      ["", "", "", "TOTAL", totalExpense],
    ]);
    wsExp["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 36 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsExp, "Rincian Pengeluaran");

    // Sheet 4: Produk Terlaris
    const wsProd = XLSX.utils.aoa_to_sheet([
      [`10 PRODUK TERLARIS - Periode: ${periodLabel}`],
      [],
      ["Peringkat", "Nama Produk", "Volume Terjual (Unit)", "Total Nilai Penjualan (Rp)"],
      ...topProducts.map((p, idx) => [idx + 1, p.name, p.quantity, p.total]),
    ]);
    wsProd["!cols"] = [{ wch: 10 }, { wch: 36 }, { wch: 22 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsProd, "Produk Terlaris");

    XLSX.writeFile(wb, `Laporan_Keuangan_${startDate}_sd_${endDate}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <AppShell active="Laporan">
      {/* ============ PRINT VIEW ============ */}
      <div id="laporan-keuangan-print" className="hidden print:block font-sans text-black p-4 bg-white">
        {/* Kop Surat */}
        <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-950">
              {businessName || "KTM DIGITAL-PRINTING"}
            </h1>
            <p className="text-xs text-slate-700 leading-relaxed">{businessAddress}</p>
            {businessPhone && (
              <p className="text-xs text-slate-700 font-medium">Kontak / WA: {businessPhone}</p>
            )}
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p className="font-bold text-slate-800">LAPORAN KEUANGAN RESMI</p>
            <p>
              Dicetak:{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="mt-0.5 border-b border-slate-400 mb-5" />

        {/* Judul */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900">
            LAPORAN KEUANGAN & OPERASIONAL BISNIS
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Periode Pembukuan:{" "}
            <strong>
              {startDate} s/d {endDate}
            </strong>
          </p>
        </div>

        {/* P&L Table */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            I. Ringkasan Laba Rugi Operasional
          </h3>
          <table className="w-full text-xs border border-slate-300">
            <tbody>
              {[
                { label: "1. Total Pendapatan Penjualan (Omzet)", value: money(revenue), bold: false },
                { label: "2. Beban Pokok Penjualan (HPP)", value: `(${money(cogs)})`, bold: false },
                { label: "3. LABA KOTOR PENJUALAN", value: money(grossProfit), bold: true },
                {
                  label: `4. Beban Operasional Toko${materialStockExpense > 0 ? ` (excl. stok/bahan ${money(materialStockExpense)} via HPP)` : ""}`,
                  value: `(${money(operationalExpense)})`,
                  bold: false,
                },
                { label: "5. LABA BERSIH OPERASIONAL (NET PROFIT)", value: `${money(netProfit)}  (${netMargin}% margin)`, bold: true, highlight: true },
                { label: `6. Arus Kas Riil Bersih  (Omzet ${money(revenue)} − Pengeluaran ${money(totalExpense)})`, value: money(netCashflow), bold: true, cashflow: true },
              ].map((row, i) => (
                <tr
                  key={i}
                  className={
                    row.highlight
                      ? "bg-slate-100"
                      : row.cashflow
                        ? "bg-blue-50/60"
                        : i % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/50"
                  }
                >
                  <td className={`border border-slate-200 p-2 ${row.bold ? "font-black text-slate-950" : "font-semibold text-slate-700"}`}>
                    {row.label}
                  </td>
                  <td
                    className={`border border-slate-200 p-2 text-right ${row.bold ? "font-black text-slate-950" : "font-semibold text-slate-800"} ${row.cashflow ? (netCashflow >= 0 ? "text-emerald-700" : "text-red-700") : ""}`}
                  >
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pengeluaran & Metode Pembayaran */}
        <div className="grid grid-cols-2 gap-4 mb-5">
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
                    <td colSpan={3} className="p-3 text-center text-slate-400">
                      Tidak ada pengeluaran
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-2">TOTAL</td>
                  <td className="p-2 text-right">{money(totalExpense)}</td>
                </tr>
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
                <tr className="bg-slate-100 font-bold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{filteredTransactions.length}</td>
                  <td className="p-2 text-right">{money(revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
            IV. 10 Produk Penjualan Teratas
          </h3>
          <table className="w-full text-xs border border-slate-300">
            <thead className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
              <tr>
                <th className="p-2 text-center w-8">No.</th>
                <th className="p-2 text-left">Nama Produk</th>
                <th className="p-2 text-center">Volume Terjual</th>
                <th className="p-2 text-right">Total Nilai Penjualan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {topProducts.map((prod, idx) => (
                <tr key={prod.name} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-2 font-medium">{prod.name}</td>
                  <td className="p-2 text-center font-bold">{prod.quantity} unit</td>
                  <td className="p-2 text-right font-semibold">{money(prod.total)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-slate-400">
                    Tidak ada produk terjual
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature */}
        <div className="break-inside-avoid grid grid-cols-2 text-center text-xs mt-8 pt-4 border-t border-slate-300">
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

      {/* ============ SCREEN VIEW ============ */}
      <div className="print:hidden mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Laporan Keuangan & Bisnis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Analisis performa penjualan, laba bersih, dan produk terlaris.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Download size={16} />
              <span>Export Excel</span>
            </button>
            <ShareExportActions
              targetSelector="#laporan-keuangan-print"
              filename={`Laporan_Keuangan_${startDate}_sd_${endDate}`}
              title="Laporan Keuangan KTM Digital Printing"
            />
          </div>
        </div>

        {/* Date Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
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
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${preset === p.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rentang:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset("custom"); }}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset("custom"); }}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-slate-400 sm:ml-auto">
              {filteredTransactions.length} transaksi · {filteredExpenses.length} pengeluaran
            </p>
          </div>
        </section>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-6">
          {[
            { title: "Total Omzet", value: money(revenue), sub: `${filteredTransactions.length} transaksi`, color: "text-blue-600" },
            { title: "Modal Terjual (HPP)", value: money(cogs), sub: "Harga pokok barang", color: "text-slate-700" },
            { title: "Laba Kotor", value: money(grossProfit), sub: "Omzet − Modal", color: "text-green-600" },
            { title: "Beban Operasional", value: money(operationalExpense), sub: "Operasional non-HPP", color: "text-amber-600" },
            { title: "Laba Bersih", value: money(netProfit), sub: `Margin: ${netMargin}%`, color: netProfit >= 0 ? "text-emerald-700" : "text-red-700" },
            { title: "Arus Kas Riil", value: money(netCashflow), sub: "Kas masuk − keluar", color: netCashflow >= 0 ? "text-blue-600" : "text-red-600" },
          ].map((card) => (
            <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
              <p className={`mt-3 text-lg font-bold tracking-tight ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-[11px] text-slate-400">{card.sub}</p>
            </article>
          ))}
        </div>

        {/* Payment & Top Products Grid */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          {/* Payment Distribution */}
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
                <div key={item.method} className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5">
                  <div>
                    <span className="font-bold text-sm text-slate-800">{item.method}</span>
                    <p className="text-xs text-slate-400">{item.count} transaksi</p>
                  </div>
                  <p className="font-bold text-sm text-slate-900">{money(item.total)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Top 10 Products */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Package className="text-blue-600" size={18} />
              <div>
                <h3 className="font-bold text-slate-900">10 Produk Paling Laris</h3>
                <p className="text-xs text-slate-400">Berdasarkan volume unit terjual</p>
              </div>
            </div>
            <div className="mt-4">
              {/* Desktop table */}
              {topProducts.length > 0 ? (
                <>
                  <div className="hidden sm:block overflow-x-auto">
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
                              <span className="mr-2 inline-block w-5 text-xs font-bold text-slate-400">
                                {idx + 1}.
                              </span>
                              <span className="font-medium text-slate-800">{p.name}</span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-blue-600">{p.quantity}</td>
                            <td className="py-2.5 text-right font-semibold text-slate-900">
                              {money(p.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-2">
                    {topProducts.map((p, idx) => (
                      <div key={p.name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 shrink-0 text-xs font-bold text-slate-400">{idx + 1}.</span>
                          <span className="text-sm font-medium text-slate-800 truncate">{p.name}</span>
                        </div>
                        <div className="shrink-0 text-right ml-2">
                          <p className="text-xs font-bold text-blue-600">{p.quantity} unit</p>
                          <p className="text-xs text-slate-600">{money(p.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada produk terjual dalam rentang tanggal ini.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Expense Breakdown */}
        {expenseCategoryBreakdown.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <BarChart3 className="text-amber-500" size={18} />
              <div>
                <h3 className="font-bold text-slate-900">Rincian Beban Pengeluaran per Kategori</h3>
                <p className="text-xs text-slate-400">Total {filteredExpenses.length} pengeluaran dalam periode ini</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {expenseCategoryBreakdown.map((c) => {
                const pct = totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-xs font-semibold text-slate-700 truncate">{c.category}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <span className="font-bold text-slate-700">{money(c.total)}</span>
                      <span className="text-slate-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
