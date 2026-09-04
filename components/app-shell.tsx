"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Users,
  WalletCards,
  Warehouse,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { createClient } from "../lib/supabase/client";
import { UserProfileMenu } from "./user-profile-menu";

const groups: {
  label: string;
  items: [string, LucideIcon, string, boolean?][];
}[] = [
  {
    label: "UTAMA",
    items: [
      ["Dashboard", Home, "/"],
      ["Kasir", ShoppingCart, "/kasir"],
    ],
  },
  {
    label: "OPERASIONAL",
    items: [
      ["Produk", Package, "/produk"],
      ["Stok", Warehouse, "/stok"],
      ["Transaksi", ClipboardList, "/transaksi"],
    ],
  },
  {
    label: "KEUANGAN",
    items: [
      ["Keuangan", WalletCards, "/keuangan"],
      ["Laporan", BarChart3, "/laporan"],
    ],
  },
  {
    label: "SISTEM",
    items: [
      ["Pengaturan", Settings, "/pengaturan"],
      ["Pengguna", Users, "/pengguna", true], // adminOnly
    ],
  },
];

export function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("ktm_user_role");
    }
    return null;
  });

  // Restore collapsed preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ktm_sidebar_collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }

    const cached = sessionStorage.getItem("ktm_user_role");
    if (cached) setUserRole(cached);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserRole(data.role);
              sessionStorage.setItem("ktm_user_role", data.role);
            }
          });
      }
    });
  }, []);

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(([, , , adminOnly]) => {
        if (adminOnly && userRole !== "SUPER_ADMIN") return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ktm_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--color-border)] bg-white transition-all duration-300 ease-in-out lg:flex lg:flex-col ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div
          className={`flex h-20 items-center border-b border-slate-100 px-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <Image
              src="/logo.png"
              alt="Logo KTM D Printing"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              priority
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                  KTM D PRINTING
                </p>
                <p className="text-[10px] font-medium tracking-wider text-slate-400">
                  POS & SYSTEM
                </p>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Kecilkan sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle Button */}
        {collapsed && (
          <div className="flex justify-center border-b border-slate-100 py-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Perluas sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        )}

        {/* Navigation - Scrollable with custom scrollbar */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6"
          aria-label="Navigasi utama"
        >
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">
                  {group.label}
                </p>
              ) : (
                <div className="my-2 border-t border-slate-100" />
              )}
              <div className="space-y-1">
                {group.items.map(([label, Icon, href]) => {
                  const NavIcon = Icon as LucideIcon;
                  const isActive = label === active;
                  return (
                    <Link
                      key={label as string}
                      href={href as string}
                      title={collapsed ? (label as string) : undefined}
                      className={`flex min-h-11 items-center rounded-lg transition ${
                        collapsed
                          ? "justify-center px-0 w-11 mx-auto"
                          : "gap-3 px-3 text-sm font-semibold"
                      } ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-bold shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <NavIcon
                        aria-hidden="true"
                        size={19}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className="shrink-0"
                      />
                      {!collapsed && <span className="truncate">{label as string}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer / User Profile (Sticky at bottom) */}
        <div className="border-t border-slate-100 p-3 bg-white">
          <UserProfileMenu compact={collapsed} />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <Image
                  src="/logo.png"
                  alt="Logo KTM D Printing"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
                <div>
                  <p className="text-sm font-bold tracking-tight text-slate-900">
                    KTM D PRINTING
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">POS & SYSTEM</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(([label, Icon, href]) => {
                      const NavIcon = Icon as LucideIcon;
                      const isActive = label === active;
                      return (
                        <Link
                          key={label as string}
                          href={href as string}
                          onClick={() => setMobileOpen(false)}
                          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                            isActive
                              ? "bg-blue-50 text-blue-600 font-bold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <NavIcon
                            aria-hidden="true"
                            size={18}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          <span>{label as string}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-100 p-4 bg-white">
              <UserProfileMenu compact={false} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`pb-24 lg:pb-8 transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
              <span className="sr-only">Buka menu</span>
            </button>

            {/* Desktop Quick Toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:flex transition"
              title={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>

            <div>
              <p className="text-[11px] font-medium text-slate-400">KTM D Printing</p>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {active}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/kasir"
              className="flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 sm:min-h-11 sm:px-4 sm:text-sm"
            >
              <ShoppingCart aria-hidden="true" size={17} />
              <span>Transaksi Baru</span>
            </Link>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-slate-200 bg-white lg:hidden shadow-lg"
        aria-label="Navigasi mobile"
      >
        {[
          [Home, "Dashboard", "/"],
          [Package, "Produk", "/produk"],
          [ShoppingCart, "Kasir", "/kasir"],
          [ClipboardList, "Transaksi", "/transaksi"],
          [MoreHorizontal, "Menu", "#menu"],
        ].map(([Icon, label, href]) => {
          const MobileIcon = Icon as LucideIcon;
          const isMore = label === "Menu";
          const isActive = label === active;

          if (isMore) {
            return (
              <button
                key={label as string}
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition"
              >
                <MobileIcon aria-hidden="true" size={19} strokeWidth={1.8} />
                <span>{label as string}</span>
              </button>
            );
          }

          return (
            <Link
              key={label as string}
              href={href as string}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${
                isActive ? "text-blue-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MobileIcon
                aria-hidden="true"
                size={19}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span>{label as string}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}