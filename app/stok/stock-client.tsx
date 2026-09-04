"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Package, RefreshCw, Plus, X, AlertTriangle } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { createClient } from "../../lib/supabase/client";

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

const quantity = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

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

  // Form states
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
      setErrorMsg(`Stok tidak mencukupi untuk pengurangan. Stok saat ini: ${selectedProduct.current_stock}`);
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
      setErrorMsg(error.message || "Gagal menyesuaikan stok. Silakan coba lagi.");
      return;
    }

    setShowModal(false);
    setQtyInput("");
    setReasonInput("");
    router.refresh();
  }

  return (
    <AppShell active="Stok">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold">Manajemen Stok</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau jumlah stok dan alasan setiap perubahan.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={17} />
            <span>Tambah / Sesuaikan Stok</span>
          </button>
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

        {/* Content sections */}
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
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
                        <p
                          className={`font-bold ${
                            isLow ? "text-amber-600" : "text-slate-800"
                          }`}
                        >
                          {quantity(Number(product.current_stock))} {product.unit}
                        </p>
                        <p className="text-xs text-slate-400">
                          Min. {quantity(Number(product.minimum_stock))}
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
                  return (
                    <div
                      key={movement.id}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isPositive
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownToLine size={16} />
                          ) : (
                            <ArrowUpFromLine size={16} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {movement.products?.name ?? "Produk"}
                          </p>
                          <p className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">
                              {movement.movement_type}
                            </span>{" "}
                            · {movement.reason ?? "Tanpa catatan"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-bold ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {quantity(Number(movement.quantity))}
                        </p>
                        <p className="text-xs text-slate-400">
                          {quantity(Number(movement.stock_before))} →{" "}
                          {quantity(Number(movement.stock_after))}
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
                  <h3 className="text-lg font-bold text-slate-900">
                    Tambah / Sesuaikan Stok
                  </h3>
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
                {/* Product Select */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Pilih Produk *
                  </label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stok saat ini: {p.current_stock} {p.unit}
                      </option>
                    ))}
                  </select>
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
                      Stok saat ini: {selectedProduct.current_stock} {selectedProduct.unit} →
                      Setelah simpan:{" "}
                      <span className="font-bold text-slate-700">
                        {movementType === "DAMAGE"
                          ? selectedProduct.current_stock - Number(qtyInput || 0)
                          : selectedProduct.current_stock + Number(qtyInput || 0)}{" "}
                        {selectedProduct.unit}
                      </span>
                    </p>
                  )}
                </div>

                {/* Reason / Note */}
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
