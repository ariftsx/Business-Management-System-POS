"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Copy,
  Check,
  ReceiptText,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "../../../components/app-shell";
import { createClient } from "../../../lib/supabase/client";

import { money, formatRupiahInput, parseRupiahInput } from "../../../lib/format";

type CartItem = { id: string; name: string; price: number; quantity: number };
type Payment = "CASH" | "TRANSFER" | "QRIS" | "DANA";

type BusinessSettings = {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  dana_number: string | null;
  dana_account_name: string | null;
  qris_image_url: string | null;
};

export default function CheckoutPage() {
  const [items] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("ktm-cart");
    return raw ? JSON.parse(raw).items ?? [] : [];
  });
  const [payment, setPayment] = useState<Payment>("CASH");
  const [received, setReceived] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState("");
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("business_settings")
      .select("bank_name, bank_account_number, bank_account_holder, dana_number, dana_account_name, qris_image_url")
      .eq("id", true)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data);
      });
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const paid = parseRupiahInput(received);
  const change = Math.max(0, paid - total);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  async function confirmPayment() {
    setError("");
    if (!items.length) {
      setError("Keranjang kosong. Kembali ke Kasir dan pilih produk.");
      return;
    }
    if (payment === "CASH" && paid < total) {
      setError("Uang diterima belum mencukupi total pembayaran.");
      return;
    }

    setSaving(true);
    const { data, error: rpcError } = await createClient().rpc("create_sale", {
      items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      method: payment,
      received_amount: payment === "CASH" ? paid : total,
    });

    if (rpcError) {
      setError(
        rpcError.message.includes("Insufficient stock")
          ? "Stok salah satu produk sudah tidak mencukupi."
          : "Transaksi belum dapat disimpan. Periksa koneksi dan coba lagi."
      );
      setSaving(false);
      return;
    }

    sessionStorage.removeItem("ktm-cart");
    setSuccessId(String(data));
    setSaving(false);
  }

  if (successId) {
    return (
      <AppShell active="Kasir">
        <div className="mx-auto max-w-xl p-5 sm:p-10">
          <section className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 size={56} className="mx-auto text-green-600" />
            <p className="mt-5 text-xs font-bold tracking-[0.16em] text-green-700">
              TRANSAKSI BERHASIL
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Pembayaran Sudah Dikonfirmasi</h2>
            <p className="mt-2 text-xs text-slate-400 font-mono">ID: {successId}</p>
            <p className="mt-4 text-3xl font-bold text-blue-600">{money(total)}</p>

            {payment === "CASH" && change > 0 && (
              <div className="mt-3 inline-block rounded-full bg-emerald-50 px-4 py-1 text-sm font-bold text-emerald-700">
                Kembalian: {money(change)}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/transaksi/${successId}`}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <ReceiptText size={17} />
                <span>Lihat & Cetak Struk</span>
              </Link>
              <Link
                href="/kasir"
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition"
              >
                <span>Transaksi Baru</span>
              </Link>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Kasir">
      <div className="mx-auto max-w-3xl p-5 sm:p-8 lg:p-10">
        <Link
          href="/kasir"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft size={17} />
          <span>Kembali ke kasir</span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Checkout Pesanan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Periksa pesanan dan konfirmasi penerimaan pembayaran.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900">Pilih Metode Pembayaran</h3>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {(["CASH", "TRANSFER", "QRIS", "DANA"] as Payment[]).map((method) => (
                  <label
                    key={method}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                      payment === method
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === method}
                      onChange={() => setPayment(method)}
                      className="accent-blue-600"
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>

              {/* CASH: Uang Diterima & Kembalian */}
              {payment === "CASH" && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Uang Diterima (Tunai) *
                  </label>
                  <div className="relative mt-1.5 flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-slate-400">Rp</span>
                    <input
                      value={received}
                      onChange={(event) =>
                        setReceived(formatRupiahInput(event.target.value))
                      }
                      inputMode="numeric"
                      placeholder="0"
                      className="min-h-12 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-base font-semibold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="text-slate-500">Kembalian:</span>
                    <span
                      className={`font-bold ${
                        change > 0 ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {money(change)}
                    </span>
                  </div>
                </div>
              )}

              {/* TRANSFER: Info Rekening Bank */}
              {payment === "TRANSFER" && (
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Informasi Transfer Bank
                  </p>
                  {settings?.bank_account_number ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Bank:</span>
                        <span className="font-bold text-slate-900">{settings.bank_name || "BCA"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">No. Rekening:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {settings.bank_account_number}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(settings.bank_account_number!, "bank")
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedField === "bank" ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Atas Nama:</span>
                        <span className="font-bold text-slate-900">
                          {settings.bank_account_holder || "KTM Printing"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Rekening bank belum diatur di Pengaturan.
                    </p>
                  )}
                </div>
              )}

              {/* QRIS: Barcode Image */}
              {payment === "QRIS" && (
                <div className="mt-6 rounded-xl border border-slate-200 p-5 text-center space-y-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Pindai Barcode QRIS
                  </p>
                  {settings?.qris_image_url ? (
                    <div className="flex justify-center">
                      <Image
                        src={settings.qris_image_url}
                        alt="Barcode QRIS"
                        width={220}
                        height={220}
                        unoptimized
                        className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
                      />
                    </div>
                  ) : (
                    <div className="py-6 text-xs text-slate-400">
                      Gambar QRIS belum diunggah di Pengaturan.
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Mendukung semua e-wallet (GoPay, OVO, Dana, ShopeePay) & m-banking.
                  </p>
                </div>
              )}

              {/* DANA: Info Akun */}
              {payment === "DANA" && (
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Pembayaran DANA
                  </p>
                  {settings?.dana_number ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Nomor DANA:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {settings.dana_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(settings.dana_number!, "dana")}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {copiedField === "dana" ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Nama Akun:</span>
                        <span className="font-bold text-slate-900">
                          {settings.dana_account_name || "KTM Printing"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Nomor DANA belum diatur di menu Pengaturan.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-lg bg-amber-50 p-3.5 text-xs text-amber-800">
                <p className="font-bold">Konfirmasi Manual Kasir</p>
                <p className="mt-0.5 leading-relaxed">
                  Pastikan dana fisik atau notifikasi mutasi rekening sudah masuk sebelum menyelesaikan transaksi.
                </p>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}
            </div>
          </section>

          {/* Cart summary column */}
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Pembayaran
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-blue-600">
              {money(total)}
            </p>
            <div className="my-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs max-h-60 overflow-y-auto">
              {items.length ? (
                items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-slate-600">
                    <span className="truncate flex-1">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-bold shrink-0">{money(item.price * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">Keranjang kosong</p>
              )}
            </div>
            <button
              disabled={saving || !items.length}
              onClick={confirmPayment}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <CreditCard size={17} />
              )}
              <span>{saving ? "Memproses..." : "Konfirmasi Pembayaran"}</span>
            </button>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
