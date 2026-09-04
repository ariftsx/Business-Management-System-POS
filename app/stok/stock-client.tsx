"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  Download,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { createClient } from "../../lib/supabase/client";
import * as XLSX from "xlsx";

export type StockProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
};

export type StockMovement = {
  id: string;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string | null;
  created_at: string;
  products: { name: string; sku: string } | null;
};

const qty = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

/** Searchable Combobox for product selection */
function ProductCombobox({
  products,
  value,
  onChange,
}: {
  products: StockProduct[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => p.id === value);

  const filtered =
    search.trim() === ""
      ? products
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase())
        );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected ? (
            <>
              <span className="font-bold">{selected.name}</span>
              <span className="ml-2 text-xs text-slate-400">
                ({selected.sku}) · Stok: {qty(selected.current_stock)} {selected.unit}
              </span>
            </>
          ) : (
            <span className="text-slate-400">Pilih produk...</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama atau SKU produk..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">Produk tidak ditemukan</p>
            ) : (
              filtered.map((p) => {
                const isLow = p.current_stock <= p.minimum_stock;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                      value === p.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.sku} · {p.category}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className={`text-sm font-bold ${isLow ? "text-amber-600" : "text-slate-700"}`}>
                        {qty(p.current_stock)} {p.unit}
                      </p>
                      {isLow && (
                        <p className="text-[10px] font-semibold text-amber-500">Menipis</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            {filtered.length} dari {products.length} produk
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockClient({
  initialProducts,
  initialMovements,
}: {
  initialProducts: StockProduct[];
  initialMovements: StockMovement[];
}) {
  const router = useRouter();
  const [products] = useState<StockProduct[]>(initialProducts);
  const [movements] = useState<StockMovement[]>(initialMovements);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedProductId, setSelectedProductId] = useState(
    initialProducts.length > 0 ? initialProducts[0].id : ""
  );
  const [movementType, setMovementType] = useState<"RESTOCK" | "ADJUSTMENT" | "DAMAGE" | "RETURN">("RESTOCK");
  const [qtyInput, setQtyInput] = useState<number | string>("");
  const [reasonInput, setReasonInput] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const lowStock = products.filter((p) => p.current_stock <= p.minimum_stock);

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    const numQty = Number(qtyInput);
    if (!selectedProductId) {
      setErrorMsg("Pilih produk terlebih dahulu.");
      return;
    }
    if (!numQty || numQty <= 0) {
      setErrorMsg("Jumlah harus lebih besar dari 0.");
      return;
    }
    const isReduction = movementType === "DAMAGE";
    const delta = isReduction ? -Math.abs(numQty) : Math.abs(numQty);
    if (isReduction && selectedProduct && selectedProduct.current_stock < Math.abs(delta)) {
      setErrorMsg(`Stok tidak mencukupi. Stok saat ini: ${selectedProduct.current_stock}`);
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("adjust_stock", {
      product_id: selectedProductId,
      amount: delta,
      movement: movementType,
      note: reasonInput.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      setErrorMsg(error.message || "Gagal menyesuaikan stok.");
      return;
    }
    setShowModal(false);
    setQtyInput("");
    setReasonInput("");
    router.refresh();
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Stok Produk
    const stockHeader = [
      ["LAPORAN RINGKASAN STOK PRODUK"],
      [`Dicetak: ${new Date().toLocaleString("id-ID")}`],
      [],
      ["Nama Produk", "SKU", "Kategori", "Stok Saat Ini", "Stok Minimum", "Satuan", "Status"],
    ];
    const stockRows = products.map((p) => [
      p.name,
      p.sku,
      p.category,
      p.current_stock,
      p.minimum_stock,
      p.unit,
      p.current_stock <= p.minimum_stock ? "MENIPIS" : "Tersedia",
    ]);
    const wsStock = XLSX.utils.aoa_to_sheet([...stockHeader, ...stockRows]);
    wsStock["!cols"] = [
      { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsStock, "Ringkasan Stok");

    // Sheet 2: Riwayat Movement
    const movHeader = [
      ["RIWAYAT PERUBAHAN STOK"],
      [`Dicetak: ${new Date().toLocaleString("id-ID")}`],
      [],
      ["Tanggal", "Produk", "SKU", "Jenis", "Jumlah", "Stok Sebelum", "Stok Sesudah", "Catatan"],
    ];
    const movRows = movements.map((m) => [
      new Date(m.created_at).toLocaleString("id-ID"),
      m.products?.name ?? "Produk",
      m.products?.sku ?? "-",
      m.movement_type,
      m.quantity,
      m.stock_before,
      m.stock_after,
      m.reason ?? "-",
    ]);
    const wsMov = XLSX.utils.aoa_to_sheet([...movHeader, ...movRows]);
    wsMov["!cols"] = [
      { wch: 20 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMov, "Riwayat Stok");

    XLSX.writeFile(wb, `Laporan_Stok_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.xlsx`);
  }

  return (
    <AppShell active="Stok">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold">Manajemen Stok</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau jumlah stok dan alasan setiap perubahan.
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
            <button
              onClick={() => setShowModal(true)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={17} />
              <span>Tambah / Sesuaikan Stok</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total produk</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{products.length}</p>
            <p className="mt-1 text-xs text-slate-400">Produk aktif</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Stok menipis</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{lowStock.length}</p>
            <p className="mt-1 text-xs text-slate-400">Perlu ditindaklanjuti</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Movement tercatat</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">{movements.length}</p>
            <p className="mt-1 text-xs text-slate-400">Riwayat perubahan terakhir</p>
          </article>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          {/* Products Summary */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h3 className="font-bold text-slate-900">Ringkasan Produk</h3>
            </div>
            {products.length ? (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {products.map((product) => {
                  const isLow = Number(product.current_stock) <= Number(product.minimum_stock);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            isLow ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          <Package size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-400">
                            {product.sku} · {product.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${isLow ? "text-amber-600" : "text-slate-800"}`}>
                          {qty(Number(product.current_stock))} {product.unit}
                        </p>
                        <p className="text-xs text-slate-400">
                          Min. {qty(Number(product.minimum_stock))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Belum ada produk untuk dipantau.
              </div>
            )}
          </section>

          {/* Stock Movements */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-bold text-slate-900">Riwayat Stok</h3>
                <p className="mt-1 text-xs text-slate-400">Perubahan stok terbaru</p>
              </div>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {movements.length ? (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {movements.map((movement) => {
                  const isPositive = Number(movement.quantity) > 0;
                  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(movement.created_at));
                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {isPositive ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {movement.products?.name ?? "Produk"}
                          </p>
                          <p className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">{movement.movement_type}</span>
                            {" · "}
                            {movement.reason ?? "Tanpa catatan"}
                            {" · "}
                            {dateFormatted}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? "+" : ""}
                          {qty(Number(movement.quantity))}
                        </p>
                        <p className="text-xs text-slate-400">
                          {qty(Number(movement.stock_before))} → {qty(Number(movement.stock_after))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Belum ada riwayat stok.
              </div>
            )}
          </section>
        </div>

        {/* Modal: Tambah / Sesuaikan Stok */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-xs sm:items-center sm:p-6">
            <form
              onSubmit={handleAdjustStock}
              className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tambah / Sesuaikan Stok</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Catat penambahan atau penyesuaian stok produk secara akurat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Searchable Product Combobox */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Pilih Produk *
                  </label>
                  <ProductCombobox
                    products={products}
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                  />
                </div>

                {/* Movement Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Jenis Perubahan *
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { type: "RESTOCK", label: "Restock (+)", desc: "Barang masuk" },
                      { type: "ADJUSTMENT", label: "Opname (+)", desc: "Koreksi fisik" },
                      { type: "DAMAGE", label: "Rusak (-)", desc: "Cacat / reject" },
                      { type: "RETURN", label: "Retur (+)", desc: "Kembali customer" },
                    ].map((m) => (
                      <button
                        key={m.type}
                        type="button"
                        onClick={() => setMovementType(m.type as any)}
                        className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                          movementType === m.type
                            ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <p>{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Jumlah ({selectedProduct?.unit ?? "Unit"}) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="Masukkan jumlah..."
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                  {selectedProduct && (
                    <p className="mt-1 text-xs text-slate-400">
                      Stok saat ini: {selectedProduct.current_stock} {selectedProduct.unit} → Setelah simpan:{" "}
                      <span className="font-bold text-slate-700">
                        {movementType === "DAMAGE"
                          ? selectedProduct.current_stock - Number(qtyInput || 0)
                          : selectedProduct.current_stock + Number(qtyInput || 0)}{" "}
                        {selectedProduct.unit}
                      </span>
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alasan / Catatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Barang masuk dari supplier PT Maju"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
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

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan Stok"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
