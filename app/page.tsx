import Link from "next/link";
import { CircleDollarSign, Bell, ShoppingCart } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { createClient } from "../lib/supabase/server";

const money = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export default async function Home() {
  const supabase = await createClient();

  // Calculate start and end of today in local date
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).toISOString();

  // Format today date in Indonesian
  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  // 1. Fetch today's paid transactions
  const { data: todayTransactions } = await supabase
    .from("sales_transactions")
    .select("id, total, created_at")
    .eq("status", "PAID")
    .gte("created_at", startOfToday);

  const todayTrxList = todayTransactions ?? [];
  const penjualanHariIni = todayTrxList.reduce((acc, trx) => acc + Number(trx.total || 0), 0);
  const transaksiHariIni = todayTrxList.length;

  // 2. Fetch modal terjual (COGS) for today
  let modalTerjual = 0;
  if (todayTrxList.length > 0) {
    const todayIds = todayTrxList.map((t) => t.id);
    const { data: items } = await supabase
      .from("transaction_items")
      .select("cost_price, quantity")
      .in("transaction_id", todayIds);

    if (items) {
      modalTerjual = items.reduce(
        (acc, item) => acc + Number(item.cost_price || 0) * Number(item.quantity || 0),
        0
      );
    }
  }

  const labaKotor = penjualanHariIni - modalTerjual;

  // 3. Fetch 7 days sales for trend chart
  const { data: weekTransactions } = await supabase
    .from("sales_transactions")
    .select("total, created_at, payment_method")
    .eq("status", "PAID")
    .gte("created_at", startOf7DaysAgo);

  const weekTrxList = weekTransactions ?? [];

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Group by day for the last 7 days
  const dayLabels: { label: string; fullDate: string; dateStr: string; total: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = toLocalDateStr(d);
    const dayName = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d);
    const fullDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
    dayLabels.push({ label: dayName, fullDate, dateStr, total: 0, count: 0 });
  }

  // Payment breakdown in the last 7 days
  const paymentBreakdown: Record<string, number> = { TUNAI: 0, TRANSFER: 0, QRIS: 0 };

  weekTrxList.forEach((trx) => {
    const trxDate = toLocalDateStr(new Date(trx.created_at));
    const dayObj = dayLabels.find((d) => d.dateStr === trxDate);
    const amount = Number(trx.total || 0);
    if (dayObj) {
      dayObj.total += amount;
      dayObj.count += 1;
    }
    const method = (trx.payment_method || "TUNAI").toUpperCase();
    if (paymentBreakdown[method] !== undefined) {
      paymentBreakdown[method] += amount;
    } else {
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amount;
    }
  });

  const totalWeekOmzet = dayLabels.reduce((acc, d) => acc + d.total, 0);
  const avgDailyOmzet = Math.round(totalWeekOmzet / 7);
  const maxDayObj = [...dayLabels].sort((a, b) => b.total - a.total)[0];
  const maxDayTotal = Math.max(...dayLabels.map((d) => d.total), 1);

  // Helper format short money (e.g. 1.5jt, 250rb)
  const formatShort = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
    if (val >= 1000) return `${Math.round(val / 1000)}rb`;
    return String(val);
  };

  // 4. Fetch low stock products (current_stock <= minimum_stock or current_stock <= 5)
  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("id, name, sku, current_stock, minimum_stock, unit")
    .eq("is_active", true)
    .order("current_stock", { ascending: true })
    .limit(4);

  const lowStockFiltered = (lowStockProducts ?? []).filter(
    (p) => Number(p.current_stock) <= (Number(p.minimum_stock) > 0 ? Number(p.minimum_stock) : 5)
  );

  // 5. Fetch latest 5 transactions
  const { data: latestTransactions } = await supabase
    .from("sales_transactions")
    .select("id, transaction_number, created_at, payment_method, total, status")
    .order("created_at", { ascending: false })
    .limit(5);

  const kpiData = [
    {
      label: "Penjualan Hari Ini",
      value: money(penjualanHariIni),
      detail: transaksiHariIni > 0 ? `${transaksiHariIni} transaksi berhasil` : "Belum ada transaksi hari ini",
      color: "text-blue-600",
    },
    {
      label: "Modal Terjual",
      value: money(modalTerjual),
      detail: penjualanHariIni > 0 ? `${Math.round((modalTerjual / penjualanHariIni) * 100)}% dari omzet` : "0% dari omzet",
      color: "text-slate-700",
    },
    {
      label: "Laba Kotor",
      value: money(labaKotor),
      detail: labaKotor >= 0 ? "Margin operasional positif" : "Perlu perhatian margin",
      color: "text-green-600",
    },
    {
      label: "Transaksi Hari Ini",
      value: String(transaksiHariIni),
      detail: transaksiHariIni > 0 ? `Total omzet ${money(penjualanHariIni)}` : "Siap melayani pesanan",
      color: "text-slate-900",
    },
  ];

  return (
    <AppShell active="Dashboard">
      <div className="mx-auto max-w-[1440px] space-y-7 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {dateFormatted}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl text-slate-900">
              Ringkasan Performa Bisnis
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/kasir"
              className="flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <ShoppingCart aria-hidden="true" size={17} />
              <span>Buka Kasir</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiData.map((kpi) => (
              <article
                key={kpi.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <CircleDollarSign aria-hidden="true" size={18} />
                  </span>
                </div>
                <p className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
                  {kpi.value}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">{kpi.detail}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 7 Days Sales Trend + Payment Method Breakdown + Low Stock */}
        <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Grafik Omzet 7 Hari Terakhir</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Visualisasi pergerakan penjualan harian beserta label nominal.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                    Total: {money(totalWeekOmzet)}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                    Rata2: {money(avgDailyOmzet)}/hari
                  </span>
                </div>
              </div>

              {/* Bar Chart with Visible Numeric Labels */}
              <div className="mt-8 flex h-56 items-end gap-2 border-b border-slate-200 px-1 pb-0 sm:gap-4">
                {dayLabels.map((day, idx) => {
                  const heightPercent =
                    day.total === 0 ? 5 : Math.max(12, Math.round((day.total / maxDayTotal) * 100));
                  const isToday = idx === 6;
                  return (
                    <div
                      key={day.dateStr}
                      className="group relative flex flex-1 flex-col items-center justify-end h-full"
                    >
                      {/* Floating Badge Label above bar */}
                      <span
                        className={`mb-1.5 text-[10px] font-bold transition-all ${
                          day.total > 0
                            ? isToday
                              ? "text-blue-700"
                              : "text-slate-600"
                            : "text-slate-300"
                        }`}
                      >
                        {day.total > 0 ? formatShort(day.total) : "0"}
                      </span>

                      {/* Bar Column */}
                      <div
                        title={`${day.label} (${day.fullDate}): ${money(day.total)} (${day.count} transaksi)`}
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[52px] rounded-t-lg transition-all group-hover:brightness-95 ${
                          isToday
                            ? "bg-gradient-to-t from-blue-600 to-blue-500 shadow-sm"
                            : day.total > 0
                            ? "bg-gradient-to-t from-blue-300 to-blue-200"
                            : "bg-slate-100"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Horizontal Date Labels */}
              <div className="mt-2.5 flex justify-between px-1 text-[11px] font-semibold text-slate-500">
                {dayLabels.map((day, idx) => (
                  <div key={day.dateStr} className="text-center flex-1">
                    <p className={idx === 6 ? "font-bold text-blue-600" : ""}>{day.label}</p>
                    <p className="text-[9px] text-slate-400">{day.fullDate}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Distribusi Pembayaran (7 Hari)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(paymentBreakdown).map(([method, amount]) => {
                  const pct = totalWeekOmzet > 0 ? Math.round((amount / totalWeekOmzet) * 100) : 0;
                  return (
                    <div key={method} className="rounded-lg bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{method}</span>
                        <span className="font-bold text-blue-600">{pct}%</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-900">{money(amount)}</p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          {/* Low stock alert & Quick Restock */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Stok Menipis</h3>
                  <p className="mt-1 text-xs text-slate-500">Perlu restock segera</p>
                </div>
                <Link href="/stok" className="text-xs font-bold text-blue-600 hover:underline">
                  Lihat semua stok
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {lowStockFiltered.length > 0 ? (
                  lowStockFiltered.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="truncate text-sm font-bold text-slate-800">{prod.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          SKU: {prod.sku} · Min: {prod.minimum_stock} {prod.unit}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          Number(prod.current_stock) <= 0
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {prod.current_stock} {prod.unit}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Semua stok dalam batas aman (tidak ada yang menipis).
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/stok"
              className="mt-4 flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Kelola & Tambah Stok
            </Link>
          </article>
        </section>

        {/* Latest Transactions */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Transaksi Terbaru</h3>
              <p className="mt-1 text-xs text-slate-500">Aktivitas penjualan kasir terakhir</p>
            </div>
            <Link href="/transaksi" className="text-xs font-bold text-blue-600 hover:underline">
              Lihat semua transaksi
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Nomor Transaksi</th>
                  <th className="pb-3 font-semibold">Waktu</th>
                  <th className="pb-3 font-semibold">Pembayaran</th>
                  <th className="pb-3 text-right font-semibold">Total</th>
                  <th className="pb-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(latestTransactions ?? []).map((trx) => {
                  const timeStr = new Intl.DateTimeFormat("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  }).format(new Date(trx.created_at));
                  return (
                    <tr
                      key={trx.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition"
                    >
                      <td className="py-4">
                        <Link
                          href={`/transaksi/${trx.id}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {trx.transaction_number}
                        </Link>
                      </td>
                      <td className="py-4 text-slate-500 text-xs">{timeStr}</td>
                      <td className="py-4 text-slate-600 font-medium">{trx.payment_method}</td>
                      <td className="py-4 text-right font-bold text-slate-900">
                        {money(Number(trx.total))}
                      </td>
                      <td className="py-4 text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            trx.status === "PAID"
                              ? "bg-green-50 text-green-700"
                              : trx.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {trx.status === "PAID"
                            ? "✓ Selesai"
                            : trx.status === "PENDING"
                            ? "Pending"
                            : "Batal"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(!latestTransactions || latestTransactions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      Belum ada transaksi tercatat. Mulai transaksi baru di Kasir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
