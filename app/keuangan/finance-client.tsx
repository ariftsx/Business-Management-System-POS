"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  WalletCards,
  Plus,
  X,
  AlertTriangle,
  Edit2,
  Lock,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { ShareExportActions } from "../../components/share-export-actions";
import { createClient } from "../../lib/supabase/client";
import { money, formatRupiahInput, parseRupiahInput } from "../../lib/format";
import * as XLSX from "xlsx";

export type ExpenseItem = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  notes?: string | null;
};

const CATEGORIES = [
  "Operasional",
  "Listrik & Air",
  "Internet & Komunikasi",
  "Bahan Baku & Material",
  "Perawatan & Sparepart Mesin",
  "Transportasi & BBM",
  "Sewa Tempat",
  "Gaji & Konsumsi",
  "Lain-lain",
];

const PAYMENT_METHODS = ["CASH", "TRANSFER", "QRIS", "DANA"] as const;

export default function FinanceClient({
  revenue,
  cogs,
  gross,
  expenseTotal,
  initialExpenses,
}: {
  revenue: number;
  cogs: number;
  gross: number;
  expenseTotal: number;
  initialExpenses: ExpenseItem[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state with server prop
  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  // Form states for Add
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS" | "DANA">("CASH");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  // Form states for Edit
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editDescription, setEditDescription] = useState("");
  const [editAmountInput, setEditAmountInput] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS" | "DANA">("CASH");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // 7-day edit rule helper
  const isExpenseEditable = (dateStr: string): boolean => {
    const expenseTime = new Date(dateStr).getTime();
    const nowTime = new Date().getTime();
    const diffDays = (nowTime - expenseTime) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const openEditModal = (exp: ExpenseItem) => {
    setErrorMsg("");
    setEditingExpense(exp);
    setEditCategory(exp.category);
    setEditDescription(exp.description);
    setEditAmountInput(formatRupiahInput(exp.amount));
    setEditPaymentMethod(exp.payment_method as any);
    setEditExpenseDate(exp.expense_date);
    setEditNotes(exp.notes || "");
  };

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const numAmount = parseRupiahInput(amountInput);
    if (!description.trim()) {
      setErrorMsg("Deskripsi pengeluaran wajib diisi.");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMsg("Nominal pengeluaran harus lebih besar dari 0.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Sesi login berakhir. Silakan refresh halaman.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        category,
        description: description.trim(),
        amount: Math.round(numAmount),
        payment_method: paymentMethod,
        expense_date: expenseDate,
        notes: notes.trim() || null,
        created_by: user.id,
      })
      .select("id, category, description, amount, expense_date, payment_method, notes")
      .single();

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || "Gagal mencatat pengeluaran.");
      return;
    }

    if (data) {
      setExpenses((prev) => [
        {
          id: data.id,
          category: data.category,
          description: data.description,
          amount: Number(data.amount),
          expense_date: data.expense_date,
          payment_method: data.payment_method,
          notes: data.notes,
        },
        ...prev,
      ]);
    }

    setSuccessMsg("Pengeluaran berhasil dicatat!");
    setShowAddModal(false);
    setDescription("");
    setAmountInput("");
    setNotes("");
    router.refresh();
  }

  async function handleUpdateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!isExpenseEditable(editingExpense.expense_date)) {
      setErrorMsg("Data pengeluaran lebih dari 7 hari tidak dapat diedit.");
      return;
    }

    const numAmount = parseRupiahInput(editAmountInput);
    if (!editDescription.trim()) {
      setErrorMsg("Deskripsi pengeluaran wajib diisi.");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMsg("Nominal pengeluaran harus lebih besar dari 0.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("expenses")
      .update({
        category: editCategory,
        description: editDescription.trim(),
        amount: Math.round(numAmount),
        payment_method: editPaymentMethod,
        expense_date: editExpenseDate,
        notes: editNotes.trim() || null,
      })
      .eq("id", editingExpense.id)
      .select("id, category, description, amount, expense_date, payment_method, notes")
      .single();

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || "Gagal memperbarui pengeluaran.");
      return;
    }

    if (data) {
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === editingExpense.id
            ? {
                id: data.id,
                category: data.category,
                description: data.description,
                amount: Number(data.amount),
                expense_date: data.expense_date,
                payment_method: data.payment_method,
                notes: data.notes,
              }
            : exp
        )
      );
    }

    setSuccessMsg("Pengeluaran berhasil diperbarui!");
    setEditingExpense(null);
    router.refresh();
  }

  const currentExpenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashflow = revenue - currentExpenseTotal;

  function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const printDate = new Date().toLocaleString("id-ID");

    // Sheet 1: Ringkasan Keuangan
    const wsSum = XLSX.utils.aoa_to_sheet([
      ["LAPORAN KEUANGAN BISNIS"],
      [`Dicetak: ${printDate}`],
      [],
      ["Keterangan", "Nominal (Rp)"],
      ["Total Omzet (Penjualan)", revenue],
      ["Modal Terjual / HPP", -cogs],
      ["Laba Kotor", gross],
      ["Beban Pengeluaran Operasional", -currentExpenseTotal],
      ["Arus Kas Riil Bersih", netCashflow],
    ]);
    wsSum["!cols"] = [{ wch: 36 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSum, "Ringkasan Keuangan");

    // Sheet 2: Rincian Pengeluaran
    const wsExp = XLSX.utils.aoa_to_sheet([
      ["RINCIAN DATA PENGELUARAN"],
      [`Dicetak: ${printDate}`],
      [],
      ["Tanggal", "Kategori", "Deskripsi", "Metode", "Nominal (Rp)", "Catatan"],
      ...expenses.map((e) => [
        e.expense_date,
        e.category,
        e.description,
        e.payment_method,
        e.amount,
        e.notes ?? "-",
      ]),
      [],
      ["", "", "", "TOTAL", currentExpenseTotal, ""],
    ]);
    wsExp["!cols"] = [
      { wch: 14 }, { wch: 26 }, { wch: 36 }, { wch: 12 }, { wch: 16 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsExp, "Rincian Pengeluaran");

    XLSX.writeFile(wb, `Laporan_Keuangan_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <AppShell active="Keuangan">
      {/* ============ PRINT VIEW ============ */}
      <div id="finance-summary-print" className="hidden print:block font-sans text-black p-4 bg-white">
        <div className="mb-4 border-b-2 border-black pb-3">
          <h1 className="text-lg font-black uppercase tracking-wide">RINGKASAN KEUANGAN & BEBAN PENGELUARAN</h1>
          <p className="text-xs text-gray-600 mt-0.5">KTM DIGITAL PRINTING POS SYSTEM</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Dicetak: {new Date().toLocaleString("id-ID")}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2 border border-gray-300 p-3 bg-gray-50 mb-4 text-center">
          <div>
            <p className="text-[9px] font-bold uppercase text-gray-500">Omzet</p>
            <p className="text-xs font-bold text-blue-700">{money(revenue)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-gray-500">HPP</p>
            <p className="text-xs font-bold text-gray-700">{money(cogs)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-gray-500">Laba Kotor</p>
            <p className="text-xs font-bold text-green-700">{money(gross)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-gray-500">Pengeluaran</p>
            <p className="text-xs font-bold text-red-700">{money(currentExpenseTotal)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase text-gray-500">Arus Kas</p>
            <p className="text-xs font-bold text-blue-800">{money(netCashflow)}</p>
          </div>
        </div>

        <h2 className="text-xs font-bold uppercase mb-2">Riwayat Pengeluaran Operasional</h2>
        <table className="w-full text-[10px] border border-gray-400 border-collapse">
          <thead className="bg-gray-100 font-bold">
            <tr>
              <th className="border border-gray-400 p-1.5 text-left">Tanggal</th>
              <th className="border border-gray-400 p-1.5 text-left">Kategori</th>
              <th className="border border-gray-400 p-1.5 text-left">Deskripsi</th>
              <th className="border border-gray-400 p-1.5 text-left">Metode</th>
              <th className="border border-gray-400 p-1.5 text-right">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, idx) => (
              <tr key={exp.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 p-1.5">{exp.expense_date}</td>
                <td className="border border-gray-300 p-1.5 font-bold">{exp.category}</td>
                <td className="border border-gray-300 p-1.5">{exp.description}</td>
                <td className="border border-gray-300 p-1.5">{exp.payment_method}</td>
                <td className="border border-gray-300 p-1.5 text-right font-bold text-red-700">
                  -{money(Number(exp.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============ SCREEN VIEW ============ */}
      <div className="print:hidden mx-auto max-w-[1440px] space-y-6 p-4 sm:p-8 lg:p-10 pb-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Keuangan Bisnis</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau omzet, modal pokok (HPP), laba kotor, beban pengeluaran, dan arus kas bersih.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Download size={16} />
              <span>Export Excel</span>
            </button>
            <ShareExportActions
              targetSelector="#finance-summary-print"
              filename={`Laporan_Keuangan_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}`}
              title="Laporan Keuangan & Pengeluaran KTM Digital Printing"
            />
            <button
              onClick={() => {
                setErrorMsg("");
                setAmountInput("");
                setShowAddModal(true);
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={17} />
              <span>Catat Pengeluaran Baru</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 5 Financial Metric Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            icon={<CircleDollarSign size={18} />}
            label="Total Omzet"
            value={revenue}
            detail="Penjualan selesai"
            tone="blue"
          />
          <Metric
            icon={<ArrowDownRight size={18} />}
            label="Modal Pokok (HPP)"
            value={cogs}
            detail="Harga pokok produk"
            tone="slate"
          />
          <Metric
            icon={<ArrowUpRight size={18} />}
            label="Laba Kotor"
            value={gross}
            detail="Omzet - Modal"
            tone="green"
          />
          <Metric
            icon={<ArrowDownRight size={18} />}
            label="Beban Pengeluaran"
            value={currentExpenseTotal}
            detail="Total operasional"
            tone="red"
          />
          <Metric
            icon={<WalletCards size={18} />}
            label="Arus Kas Bersih"
            value={netCashflow}
            detail="Omzet - Pengeluaran"
            tone="blue"
          />
        </div>

        {/* Expense History Table */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
            <div>
              <h3 className="font-bold text-slate-900">Riwayat Pengeluaran</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Pengeluaran dapat diedit dalam waktu maksimal 7 hari sejak tanggal pencatatan.
              </p>
            </div>
            <Link href="/laporan" className="text-xs font-bold text-blue-600 hover:underline">
              Lihat laporan lengkap
            </Link>
          </div>
          {expenses.length ? (
            <div className="divide-y divide-slate-100">
              {expenses.map((expense) => {
                const canEdit = isExpenseEditable(expense.expense_date);
                return (
                  <div
                    key={expense.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {expense.description}
                        </p>
                        {!canEdit && (
                          <span
                            title="Terkunci: Data lebih dari 7 hari tidak dapat diubah demi keamanan dan integritas pembukuan."
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                          >
                            <Lock size={11} />
                            <span>Terkunci</span>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-600">{expense.category}</span> ·{" "}
                        {expense.payment_method} ·{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(expense.expense_date))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <p className="font-bold text-red-600">
                        -{money(Number(expense.amount))}
                      </p>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEditModal(expense)}
                          className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          &gt;7 hari
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              Belum ada pengeluaran tercatat. Klik tombol &ldquo;Catat Pengeluaran Baru&rdquo; untuk menambahkan.
            </div>
          )}
        </section>

        {/* Modal: Catat Pengeluaran Baru */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 pt-10 sm:p-6 backdrop-blur-xs flex min-h-full items-end sm:items-center justify-center">
            <form
              onSubmit={handleAddExpense}
              className="w-full max-w-lg my-auto rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Catat Pengeluaran Baru</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Masukkan rincian beban operasional atau belanja bahan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Deskripsi / Keperluan *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Beli toner cetak hitam 2 botol"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Amount with live Rupiah formatting & Date */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nominal (Rp) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-slate-400">Rp</span>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amountInput}
                        onChange={(e) => setAmountInput(formatRupiahInput(e.target.value))}
                        className="w-full min-h-11 rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Tanggal Pengeluaran *
                    </label>
                    <input
                      required
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Metode Pembayaran *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                          paymentMethod === method
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nota pembelian tersimpan di map admin"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Pengeluaran */}
        {editingExpense && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 pt-10 sm:p-6 backdrop-blur-xs flex min-h-full items-end sm:items-center justify-center">
            <form
              onSubmit={handleUpdateExpense}
              className="w-full max-w-lg my-auto rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            >
              <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Data Pengeluaran</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Koreksi data pengeluaran (hanya berlaku dalam batas 7 hari).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Deskripsi / Keperluan *
                  </label>
                  <input
                    required
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nominal (Rp) *
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-slate-400">Rp</span>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={editAmountInput}
                        onChange={(e) => setEditAmountInput(formatRupiahInput(e.target.value))}
                        className="w-full min-h-11 rounded-lg border border-slate-200 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Tanggal Pengeluaran *
                    </label>
                    <input
                      required
                      type="date"
                      value={editExpenseDate}
                      onChange={(e) => setEditExpenseDate(e.target.value)}
                      className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Metode Pembayaran *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setEditPaymentMethod(method)}
                        className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                          editPaymentMethod === method
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Edit2 size={16} />
                  <span>{submitting ? "Memperbarui..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: "blue" | "slate" | "green" | "red";
}) {
  const colors = {
    blue: "text-blue-600",
    slate: "text-slate-700",
    green: "text-green-600",
    red: "text-red-600",
  };
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
      <p className={`mt-3 sm:mt-4 text-lg sm:text-xl font-bold tracking-tight ${colors[tone]}`}>
        {money(value)}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
    </article>
  );
}
