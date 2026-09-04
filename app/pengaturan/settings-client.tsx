"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Building2,
  CreditCard,
  Image as ImageIcon,
  ReceiptText,
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { createClient } from "../../lib/supabase/client";

export type BusinessSettingsData = {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  dana_number: string;
  dana_account_name: string;
  qris_image_url: string;
  logo_url: string;
  receipt_footer: string;
};

export default function SettingsClient({
  initialSettings,
}: {
  initialSettings: BusinessSettingsData;
}) {
  const [formData, setFormData] = useState<BusinessSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQRIS, setUploadingQRIS] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (key: keyof BusinessSettingsData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  async function handleFileUpload(file: File, type: "logo" | "qris") {
    const supabase = createClient();
    const isLogo = type === "logo";
    if (isLogo) setUploadingLogo(true);
    else setUploadingQRIS(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(filePath);

      if (isLogo) {
        setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
      } else {
        setFormData((prev) => ({ ...prev, qris_image_url: publicUrl }));
      }
      setSuccessMsg(`File ${type.toUpperCase()} berhasil diunggah.`);
    } catch (err: any) {
      setErrorMsg(err.message || `Gagal mengunggah file ${type}.`);
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingQRIS(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        id: true,
        business_name: formData.business_name,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        bank_name: formData.bank_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_account_holder: formData.bank_account_holder || null,
        dana_number: formData.dana_number || null,
        dana_account_name: formData.dana_account_name || null,
        qris_image_url: formData.qris_image_url || null,
        logo_url: formData.logo_url || null,
        receipt_footer: formData.receipt_footer || "Terima kasih telah berbelanja.",
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("business_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg("Pengaturan bisnis berhasil disimpan!");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell active="Pengaturan">
      <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8 lg:p-10">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pengaturan Bisnis</h2>
          <p className="mt-1 text-sm text-slate-500">
            Simpan identitas bisnis, informasi pembayaran manual, QRIS, dan format struk operasional.
          </p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Profile */}
          <FormSection
            icon={<Building2 size={19} />}
            title="Profil Bisnis"
            description="Informasi yang muncul pada aplikasi, header struk cetak, dan faktur."
          >
            <Field
              label="Nama Bisnis *"
              required
              value={formData.business_name}
              onChange={(val) => handleChange("business_name", val)}
              placeholder="Contoh: Karya Teknik Makmur D-Printing"
            />
            <Field
              label="Alamat Lengkap"
              value={formData.address}
              onChange={(val) => handleChange("address", val)}
              placeholder="Contoh: Jl. Percetakan Raya No. 12, Jakarta Barat"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nomor Telepon / WhatsApp"
                value={formData.phone}
                onChange={(val) => handleChange("phone", val)}
                placeholder="Contoh: 081234567890"
              />
              <Field
                label="Email Bisnis"
                type="email"
                value={formData.email}
                onChange={(val) => handleChange("email", val)}
                placeholder="Contoh: info@ktmprinting.com"
              />
            </div>
          </FormSection>

          {/* Payment Settings */}
          <FormSection
            icon={<CreditCard size={19} />}
            title="Pembayaran Non-Tunai Manual"
            description="Informasi rekening bank dan nomor e-wallet yang ditampilkan kepada kasir saat transaksi."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Nama Bank"
                value={formData.bank_name}
                onChange={(val) => handleChange("bank_name", val)}
                placeholder="Contoh: BCA / Mandiri / BRI"
              />
              <Field
                label="Nomor Rekening"
                value={formData.bank_account_number}
                onChange={(val) => handleChange("bank_account_number", val)}
                placeholder="Nomor rekening"
              />
              <Field
                label="Nama Pemilik Rekening"
                value={formData.bank_account_holder}
                onChange={(val) => handleChange("bank_account_holder", val)}
                placeholder="Nama sesuai buku tabungan"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <Field
                label="Nomor Akun DANA"
                value={formData.dana_number}
                onChange={(val) => handleChange("dana_number", val)}
                placeholder="Contoh: 081234567890"
              />
              <Field
                label="Nama Akun DANA"
                value={formData.dana_account_name}
                onChange={(val) => handleChange("dana_account_name", val)}
                placeholder="Contoh: KTM D-Printing"
              />
            </div>
          </FormSection>

          {/* Receipt Settings */}
          <FormSection
            icon={<ReceiptText size={19} />}
            title="Pengaturan Struk"
            description="Pesan penutup yang dicetak di bagian paling bawah struk kasir."
          >
            <Field
              label="Pesan Footer Struk"
              value={formData.receipt_footer}
              onChange={(val) => handleChange("receipt_footer", val)}
              placeholder="Contoh: Terima kasih telah berbelanja di KTM D-Printing!"
            />
          </FormSection>

          {/* Logo & QRIS Assets */}
          <FormSection
            icon={<ImageIcon size={19} />}
            title="QRIS & Logo Bisnis"
            description="Unggah aset logo bisnis dan gambar barcode QRIS untuk checkout kasir."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Logo Upload */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logo Bisnis
                </p>
                <div className="flex h-36 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 overflow-hidden relative">
                  {formData.logo_url ? (
                    <Image
                      src={formData.logo_url}
                      alt="Logo Bisnis"
                      width={120}
                      height={120}
                      unoptimized
                      className="max-h-full w-auto object-contain p-2"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={32} className="mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Belum ada logo</p>
                    </div>
                  )}
                </div>
                <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Upload size={14} />
                  <span>{uploadingLogo ? "Mengunggah..." : "Unggah Logo Baru"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLogo}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "logo");
                    }}
                  />
                </label>
              </div>

              {/* QRIS Upload */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Barcode QRIS
                </p>
                <div className="flex h-36 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 overflow-hidden relative">
                  {formData.qris_image_url ? (
                    <Image
                      src={formData.qris_image_url}
                      alt="Barcode QRIS"
                      width={120}
                      height={120}
                      unoptimized
                      className="max-h-full w-auto object-contain p-2"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <CreditCard size={32} className="mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Belum ada barcode QRIS</p>
                    </div>
                  )}
                </div>
                <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Upload size={14} />
                  <span>{uploadingQRIS ? "Mengunggah..." : "Unggah QRIS Baru"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingQRIS}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "qris");
                    }}
                  />
                </label>
              </div>
            </div>
          </FormSection>

          {/* Submit button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition"
            >
              <Save size={18} />
              <span>{saving ? "Menyimpan Pengaturan..." : "Simpan Semua Pengaturan"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 transition"
      />
    </label>
  );
}
