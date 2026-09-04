"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(formData: FormData) {
    setLoading(true); setError("");
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: String(formData.get("email")).trim(), password: String(formData.get("password")) });
    if (signInError) {
      if (signInError.status && signInError.status >= 500) {
        setError("Terjadi kendala pada server autentikasi. Silakan coba sesaat lagi.");
      } else {
        setError("Email atau password belum benar. Silakan coba lagi.");
      }
      setLoading(false);
      return;
    }
    router.replace("/"); router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-5"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><div className="flex flex-col items-center text-center"><Image src="/logo.png" alt="Logo KTM Digital Printing" width={144} height={144} className="h-28 w-auto object-contain" priority /><p className="mt-5 text-xs font-bold tracking-[0.18em] text-blue-600">KTM Digital Printing</p><h1 className="mt-2 text-2xl font-bold">Selamat datang kembali</h1><p className="mt-2 text-sm text-slate-500">Masuk untuk mengelola operasional bisnis.</p></div><form action={login} className="mt-8 space-y-5"><label className="block text-sm font-bold text-slate-700">Email<input name="email" type="email" required autoComplete="email" className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="nama@email.com" /></label><label className="block text-sm font-bold text-slate-700">Password<input name="password" type="password" required autoComplete="current-password" className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-500" placeholder="Masukkan password" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}<button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? "Memeriksa..." : <><LogIn aria-hidden="true" size={18} /> Masuk ke Sistem</>}</button></form></div></main>;
}