"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export function UserProfileMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile(data);
              sessionStorage.setItem("ktm_user_role", data.role);
            } else {
              setProfile({
                full_name: user.email?.split("@")[0] ?? "Pengguna",
                role: "USER",
              });
              sessionStorage.setItem("ktm_user_role", "USER");
            }
          });
      }
    });
  }, []);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    sessionStorage.removeItem("ktm_user_role");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const initials = (profile?.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 py-1">
        <div
          title={`${profile?.full_name ?? "User"} (${profile?.role === "SUPER_ADMIN" ? "Super Admin" : "Kasir"})`}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
        >
          {initials || <UserRound aria-hidden="true" size={16} />}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          title="Keluar / Log out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
        >
          <LogOut aria-hidden="true" size={16} />
          <span className="sr-only">Keluar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
          {initials || <UserRound aria-hidden="true" size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{profile?.full_name ?? "Memuat..."}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            {profile?.role === "SUPER_ADMIN" ? "Super Admin" : "Kasir"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        title="Keluar / Log out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
      >
        <LogOut aria-hidden="true" size={16} />
        <span className="sr-only">Keluar</span>
      </button>
    </div>
  );
}
