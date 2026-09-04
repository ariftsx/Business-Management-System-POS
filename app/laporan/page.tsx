import { createClient } from "../../lib/supabase/server";
import ReportsClient, {
  type ReportTransaction,
  type ReportExpense,
} from "./reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: transactionsData },
    { data: expensesData },
    { data: settingsData },
  ] = await Promise.all([
    supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        created_at,
        payment_method,
        total,
        transaction_items (
          product_name,
          quantity,
          cost_price,
          selling_price,
          subtotal
        )
      `)
      .eq("status", "PAID")
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, payment_method")
      .order("expense_date", { ascending: false }),
    supabase
      .from("business_settings")
      .select("business_name, address, phone, logo_url")
      .eq("id", true)
      .single(),
  ]);

  const transactions: ReportTransaction[] = (transactionsData ?? []).map((t: any) => ({
    id: t.id,
    transaction_number: t.transaction_number,
    created_at: t.created_at,
    payment_method: t.payment_method,
    total: Number(t.total || 0),
    items: (t.transaction_items ?? []).map((item: any) => ({
      product_name: item.product_name,
      quantity: Number(item.quantity || 0),
      cost_price: Number(item.cost_price || 0),
      selling_price: Number(item.selling_price || 0),
      subtotal: Number(item.subtotal || 0),
    })),
  }));

  const expenses: ReportExpense[] = (expensesData ?? []).map((e: any) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount || 0),
    expense_date: e.expense_date,
    payment_method: e.payment_method,
  }));

  return (
    <ReportsClient
      transactions={transactions}
      expenses={expenses}
      businessName={settingsData?.business_name ?? "KTM D-Printing"}
      businessAddress={settingsData?.address ?? ""}
      businessPhone={settingsData?.phone ?? ""}
      logoUrl={settingsData?.logo_url ?? null}
    />
  );
}
