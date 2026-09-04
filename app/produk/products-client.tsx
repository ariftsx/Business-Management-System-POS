"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { createClient } from "../../lib/supabase/client";
import {
  Image as ImageIcon,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Upload,
  Download,
} from "lucide-react";
import { formatRupiahInput, parseRupiahInput, money } from "../../lib/format";
import * as XLSX from "xlsx";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string | null;
};

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState("Semua kategori");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form states for Add Product
  const [addPrice, setAddPrice] = useState("");
  const [addCost, setAddCost] = useState("");
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string>("");

  // Form states for Edit Product
  const [editPrice, setEditPrice] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.sku.toLowerCase().includes(query.toLowerCase())) &&
          (category === "Semua kategori" || product.category === category)
      ),
    [products, query, category]
  );

  const categories = ["Semua kategori", ...Array.from(new Set(products.map((p) => p.category)))];

  async function uploadProductImage(file: File): Promise<string | null> {
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("assets")
        .upload(`products/${fileName}`, file, { upsert: true });

      if (error || !data) {
        console.error("Upload error:", error);
        return null;
      }
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Storage upload failed:", err);
      return null;
    }
  }

  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const price = parseRupiahInput(addPrice);
    const cost = parseRupiahInput(addCost);
    const stockVal = form.get("stock");
    const stock = stockVal ? Number(stockVal) : 0;
    const minStockVal = form.get("minStock");
    const minStock = minStockVal ? Number(minStockVal) : 0;

    if (price < cost) {
      setFormError("Harga jual harus lebih besar atau sama dengan harga modal.");
      setSubmitting(false);
      return;
    }

    let uploadedImageUrl: string | null = null;
    if (addImageFile) {
      uploadedImageUrl = await uploadProductImage(addImageFile);
    }

    const payload: any = {
      name: String(form.get("name")),
      sku: String(form.get("sku")),
      category: String(form.get("category")),
      unit: String(form.get("unit")),
      cost_price: cost,
      selling_price: price,
      current_stock: stock,
      minimum_stock: minStock,
    };

    if (uploadedImageUrl) {
      payload.image_url = uploadedImageUrl;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id, name, sku, category, selling_price, cost_price, current_stock, minimum_stock, unit, image_url")
      .single();

    setSubmitting(false);

    if (error) {
      setFormError(
        error.code === "23505"
          ? "SKU sudah digunakan. Gunakan SKU lain."
          : "Produk belum dapat disimpan. Periksa data dan coba lagi."
      );
      return;
    }

    if (data) {
      setProducts((current) => [
        {
          id: data.id,
          name: data.name,
          sku: data.sku,
          category: data.category,
          price: Number(data.selling_price),
          cost: Number(data.cost_price),
          stock: Number(data.current_stock),
          minStock: Number(data.minimum_stock || 0),
          unit: data.unit,
          imageUrl: data.image_url ?? null,
        },
        ...current,
      ]);
    }

    setShowAddModal(false);
    setAddPrice("");
    setAddCost("");
    setAddImageFile(null);
    setAddImagePreview("");
    router.refresh();
  }

  async function updateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const price = parseRupiahInput(editPrice);
    const cost = parseRupiahInput(editCost);
    const minStockVal = form.get("minStock");
    const minStock = minStockVal ? Number(minStockVal) : 0;

    if (price < cost) {
      setFormError("Harga jual harus lebih besar atau sama dengan harga modal.");
      setSubmitting(false);
      return;
    }

    let finalImageUrl = editingProduct.imageUrl ?? null;
    if (editImageFile) {
      const uploaded = await uploadProductImage(editImageFile);
      if (uploaded) {
        finalImageUrl = uploaded;
      }
    }

    const payload: any = {
      name: String(form.get("name")),
      sku: String(form.get("sku")),
      category: String(form.get("category")),
      unit: String(form.get("unit")),
      cost_price: cost,
      selling_price: price,
      minimum_stock: minStock,
      image_url: finalImageUrl,
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editingProduct.id)
      .select("id, name, sku, category, selling_price, cost_price, current_stock, minimum_stock, unit, image_url")
      .single();

    setSubmitting(false);

    if (error) {
      setFormError(
        error.code === "23505"
          ? "SKU sudah digunakan oleh produk lain."
          : "Gagal memperbarui produk."
      );
      return;
    }

    if (data) {
      setProducts((current) =>
        current.map((p) =>
          p.id === editingProduct.id
            ? {
                id: data.id,
                name: data.name,
                sku: data.sku,
                category: data.category,
                price: Number(data.selling_price),
                cost: Number(data.cost_price),
                stock: Number(data.current_stock),
                minStock: Number(data.minimum_stock || 0),
                unit: data.unit,
                imageUrl: data.image_url ?? null,
              }
            : p
        )
      );
    }

    setEditingProduct(null);
    setEditPrice("");
    setEditCost("");
    setEditImageFile(null);
    setEditImagePreview("");
    router.refresh();
  }

  async function handleDeactivate(product: Product) {
    const confirm = window.confirm(
      `Apakah Anda yakin ingin menonaktifkan produk "${product.name}"? Produk tidak akan muncul di kasir.`
    );
    if (!confirm) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      alert("Gagal menonaktifkan produk: " + error.message);
      return;
    }

    setProducts((current) => current.filter((p) => p.id !== product.id));
    router.refresh();
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.aoa_to_sheet([
      ["KATALOG PRODUK AKTIF"],
      [`Dicetak: ${new Date().toLocaleString("id-ID")} · Total: ${products.length} produk`],
      [],
      ["Nama Produk", "SKU", "Kategori", "Harga Jual (Rp)", "Harga Modal/HPP (Rp)", "Laba/Unit (Rp)", "Margin (%)", "Stok Saat Ini", "Stok Min.", "Satuan"],
      ...products.map((p) => {
        const profit = p.price - p.cost;
        const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;
        return [
          p.name,
          p.sku,
          p.category,
          p.price,
          p.cost,
          profit,
          `${margin}%`,
          p.stock,
          p.minStock,
          p.unit,
        ];
      }),
    ]);
    wsData["!cols"] = [
      { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsData, "Katalog Produk");
    XLSX.writeFile(wb, `Katalog_Produk_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.xlsx`);
  }

  return (
    <AppShell active="Produk">
      <div className="mx-auto max-w-[1440px] space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Katalog Produk</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola harga jual, harga pokok (HPP), satuan, dan stok produk percetakan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Download aria-hidden="true" size={16} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => {
                setFormError("");
                setAddPrice("");
                setAddCost("");
                setAddImageFile(null);
                setAddImagePreview("");
                setShowAddModal(true);
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus aria-hidden="true" size={18} />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row shadow-sm">
          <label className="flex min-h-11 flex-1 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm text-slate-400">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Cari produk</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau SKU produk..."
              className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </section>

        {/* Product Cards Grid */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-bold text-slate-900">{filtered.length} produk aktif</p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((product) => {
              const profitPerUnit = product.price - product.cost;
              const marginPercent =
                product.price > 0 ? Math.round((profitPerUnit / product.price) * 100) : 0;
              const isLowStock = product.stock <= (product.minStock > 0 ? product.minStock : 5);

              return (
                <article
                  key={product.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition hover:shadow-md"
                >
                  <div>
                    <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 text-blue-300">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon aria-hidden="true" size={36} strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-slate-900" title={product.name}>
                          {product.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {product.sku} · {product.category}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isLowStock
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {isLowStock ? "Menipis" : "Tersedia"}
                      </span>
                    </div>

                    {/* Price & Cost Breakdown */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Harga Jual</p>
                        <p className="mt-0.5 text-sm font-bold text-blue-600">
                          {money(product.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Harga Pokok (HPP)</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-600">
                          {money(product.cost)}
                        </p>
                      </div>
                    </div>

                    {/* Profit margin badge & stock */}
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <TrendingUp size={13} />
                        <span>Laba: {money(profitPerUnit)} ({marginPercent}%)</span>
                      </span>
                      <span className="font-bold text-slate-800">
                        {product.stock} {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Deactivate */}
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError("");
                        setEditingProduct(product);
                        setEditPrice(formatRupiahInput(product.price));
                        setEditCost(formatRupiahInput(product.cost));
                        setEditImageFile(null);
                        setEditImagePreview(product.imageUrl || "");
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(product)}
                      title="Nonaktifkan produk"
                      className="flex h-8 items-center rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              Belum ada produk yang cocok. Tambahkan produk atau sesuaikan kata kunci pencarian.
            </div>
          )}
        </section>

        {/* Modal: Tambah Produk Baru */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-xs sm:items-center sm:p-6">
            <form
              onSubmit={addProduct}
              className="w-full max-w-xl rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Tambah Produk Baru</h3>
                  <p className="mt-1 text-xs text-slate-500">Isi data lengkap produk untuk katalog dan kasir.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nama Produk *
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="Contoh: Banner Flexi 280gr"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  SKU / Kode Produk *
                  <input
                    required
                    name="sku"
                    type="text"
                    placeholder="Contoh: BNR-280"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Kategori *
                  <input
                    required
                    name="category"
                    type="text"
                    placeholder="Contoh: Banner / Stiker"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Satuan *
                  <input
                    required
                    name="unit"
                    type="text"
                    placeholder="Contoh: meter / pcs / lbr"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Harga Pokok (HPP) (Rp) *
                  <input
                    required
                    name="cost"
                    type="text"
                    inputMode="numeric"
                    value={addCost}
                    onChange={(e) => setAddCost(formatRupiahInput(e.target.value))}
                    placeholder="0"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Harga Jual (Rp) *
                  <input
                    required
                    name="price"
                    type="text"
                    inputMode="numeric"
                    value={addPrice}
                    onChange={(e) => setAddPrice(formatRupiahInput(e.target.value))}
                    placeholder="0"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Stok Awal *
                  <input
                    required
                    name="stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Batas Minimum Stok
                  <input
                    name="minStock"
                    type="number"
                    min="0"
                    placeholder="5"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>

                {/* Optional Product Image Upload */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Foto Produk (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    {addImagePreview ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                        <img src={addImagePreview} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setAddImageFile(null);
                            setAddImagePreview("");
                          }}
                          className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                      <Upload size={14} />
                      <span>{addImagePreview ? "Ganti Foto" : "Pilih Foto Produk"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAddImageFile(file);
                            setAddImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
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
                  <Plus size={18} />
                  <span>{submitting ? "Menyimpan..." : "Simpan Produk"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Produk */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-xs sm:items-center sm:p-6">
            <form
              onSubmit={updateProduct}
              className="w-full max-w-xl rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Edit Data Produk</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Perbarui nama, SKU, kategori, atau harga pokok/jual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nama Produk *
                  <input
                    required
                    name="name"
                    type="text"
                    defaultValue={editingProduct.name}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  SKU / Kode Produk *
                  <input
                    required
                    name="sku"
                    type="text"
                    defaultValue={editingProduct.sku}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Kategori *
                  <input
                    required
                    name="category"
                    type="text"
                    defaultValue={editingProduct.category}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Satuan *
                  <input
                    required
                    name="unit"
                    type="text"
                    defaultValue={editingProduct.unit}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Harga Pokok (HPP) (Rp) *
                  <input
                    required
                    name="cost"
                    type="text"
                    inputMode="numeric"
                    value={editCost}
                    onChange={(e) => setEditCost(formatRupiahInput(e.target.value))}
                    placeholder="0"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Harga Jual (Rp) *
                  <input
                    required
                    name="price"
                    type="text"
                    inputMode="numeric"
                    value={editPrice}
                    onChange={(e) => setEditPrice(formatRupiahInput(e.target.value))}
                    placeholder="0"
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">
                  Batas Minimum Stok
                  <input
                    name="minStock"
                    type="number"
                    min="0"
                    placeholder="5"
                    defaultValue={editingProduct.minStock}
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </label>

                {/* Optional Product Image Upload in Edit */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Foto Produk (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    {editImagePreview ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                        <img src={editImagePreview} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setEditImageFile(null);
                            setEditImagePreview("");
                          }}
                          className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                      <Upload size={14} />
                      <span>{editImagePreview ? "Ganti Foto" : "Pilih Foto Produk"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditImageFile(file);
                            setEditImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
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
                  <span>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
