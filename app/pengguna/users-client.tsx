"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  UsersRound,
  ShieldCheck,
  UserRound,
  X,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  KeyRound,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { createClient } from "../../lib/supabase/client";

export type UserProfileItem = {
  id: string;
  full_name: string;
  role: "SUPER_ADMIN" | "USER";
  is_active: boolean;
  created_at: string;
};

export default function UsersClient({
  initialProfiles,
}: {
  initialProfiles: UserProfileItem[];
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfileItem[]>(initialProfiles);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfileItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state when initialProfiles from server changes
  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  // Add Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "USER">("USER");

  // Edit Form state
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"SUPER_ADMIN" | "USER">("USER");
  const [editPassword, setEditPassword] = useState("");

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!editFullName.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (editPassword.trim() && editPassword.length < 6) {
      setErrorMsg("Password baru minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_user_profile", {
      target_user_id: editingUser.id,
      new_full_name: editFullName.trim(),
      new_role: editRole,
      new_password: editPassword.trim() ? editPassword : null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || "Gagal memperbarui pengguna.");
      return;
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === editingUser.id
          ? { ...p, full_name: editFullName.trim(), role: editRole }
          : p
      )
    );

    setSuccessMsg("Data pengguna berhasil diperbarui!");
    setEditingUser(null);
    router.refresh();
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Alamat email tidak valid.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data: newId, error } = await supabase.rpc("create_new_user", {
      new_email: email.trim(),
      new_password: password,
      new_full_name: fullName.trim(),
      new_role: role,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || "Gagal membuat pengguna baru.");
      return;
    }

    setSuccessMsg("Pengguna baru berhasil ditambahkan!");
    setShowModal(false);

    if (newId) {
      setProfiles((prev) => [
        {
          id: String(newId),
          full_name: fullName.trim(),
          role: role,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setFullName("");
    setEmail("");
    setPassword("");
    setRole("USER");
    router.refresh();
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    setTogglingId(userId);
    setErrorMsg("");
    const supabase = createClient();

    const { error } = await supabase.rpc("toggle_user_status", {
      target_user_id: userId,
      new_status: !currentStatus,
    });

    setTogglingId(null);

    if (error) {
      setErrorMsg(error.message || "Gagal mengubah status pengguna.");
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, is_active: !currentStatus } : p))
    );
    router.refresh();
  }

  return (
    <AppShell active="Pengguna">
      <div className="mx-auto max-w-[1200px] space-y-6 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola akun akses kasir dan hak kelola operasional bisnis KTM DIGITAL-PRINTING.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <UserPlus size={17} />
            <span>Tambah Pengguna</span>
          </button>
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

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {profiles.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                  <tr>
                    <th className="p-4">Pengguna</th>
                    <th className="p-4">Peran / Hak Akses</th>
                    <th className="p-4">Tanggal Bergabung</th>
                    <th className="p-4 text-center">Status Akun</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            {profile.role === "SUPER_ADMIN" ? (
                              <ShieldCheck size={18} />
                            ) : (
                              <UserRound size={18} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{profile.full_name}</p>
                            <p className="text-xs text-slate-400">ID: {profile.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${profile.role === "SUPER_ADMIN"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                            }`}
                        >
                          {profile.role === "SUPER_ADMIN" ? "Super Admin" : "Kasir"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(profile.created_at))}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${profile.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          {profile.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(profile);
                              setEditFullName(profile.full_name);
                              setEditRole(profile.role);
                              setEditPassword("");
                              setErrorMsg("");
                            }}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === profile.id}
                            onClick={() => handleToggleStatus(profile.id, profile.is_active)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${profile.is_active
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-600 hover:bg-green-50"
                              } disabled:opacity-50`}
                          >
                            {togglingId === profile.id
                              ? "Memproses..."
                              : profile.is_active
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <UsersRound size={36} className="mx-auto text-slate-300" />
              <p className="mt-4 font-bold text-slate-600">Belum ada profil pengguna</p>
              <p className="mt-1 text-sm text-slate-400">
                Tambahkan akun kasir atau staf untuk operasional.
              </p>
            </div>
          )}
        </section>

        {/* Modal: Tambah Pengguna */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-xs sm:items-center sm:p-6">
            <form
              onSubmit={handleCreateUser}
              className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tambah Pengguna Baru</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Akun baru dapat langsung digunakan login ke sistem POS.
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Lengkap *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alamat Email (Untuk Login) *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Password (Minimal 6 Karakter) *
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Peran / Hak Akses *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("USER")}
                      className={`rounded-xl border p-3 text-left transition ${role === "USER"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <p className="font-bold text-xs">Kasir (User)</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Akses transaksi kasir & katalog produk
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("SUPER_ADMIN")}
                      className={`rounded-xl border p-3 text-left transition ${role === "SUPER_ADMIN"
                          ? "border-purple-600 bg-purple-50 text-purple-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <p className="font-bold text-xs">Super Admin</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Akses penuh semua modul & pengaturan
                      </p>
                    </button>
                  </div>
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
                  {submitting ? "Membuat Akun..." : "Buat Akun Pengguna"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Pengguna */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-xs sm:items-center sm:p-6">
            <form
              onSubmit={handleUpdateUser}
              className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Pengguna</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Perbarui nama lengkap, hak akses peran, atau reset password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Lengkap *
                  </label>
                  <input
                    required
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reset Password (Opsional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Kosongkan jika tidak ingin ganti password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Masukkan minimal 6 karakter baru jika ingin mengubah password akun.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Peran / Hak Akses *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditRole("USER")}
                      className={`rounded-xl border p-3 text-left transition ${editRole === "USER"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <p className="font-bold text-xs">Kasir (User)</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Akses transaksi kasir & katalog produk
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole("SUPER_ADMIN")}
                      className={`rounded-xl border p-3 text-left transition ${editRole === "SUPER_ADMIN"
                          ? "border-purple-600 bg-purple-50 text-purple-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <p className="font-bold text-xs">Super Admin</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Akses penuh semua modul & pengaturan
                      </p>
                    </button>
                  </div>
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
                  onClick={() => setEditingUser(null)}
                  className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Edit2 size={15} />
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
