import { createClient } from "../../lib/supabase/server";
import FinanceClient, { type ExpenseItem } from "./finance-client";

export default async function FinancePage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: expensesData }] = await Promise.all([
    supabase
      .from("sales_transactions")
      .select("total, payment_method, transaction_items(quantity, cost_price)")
      .eq("status", "PAID"),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, payment_method")
      .order("expense_date", { ascending: false })
      .limit(20),
  ]);

  const revenue = (transactions ?? []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const cogs = (transactions ?? []).reduce(
    (sum, item) =>
      sum +
      (item.transaction_items ?? []).reduce(
        (line, detail) => line + Number(detail.quantity || 0) * Number(detail.cost_price || 0),
        0
      ),
    0
  );
  const expenseTotal = (expensesData ?? []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const gross = revenue - cogs;

  const expenses: ExpenseItem[] = (expensesData ?? []).map((exp) => ({
    id: exp.id,
    category: exp.category,
    description: exp.description,
    amount: Number(exp.amount),
    expense_date: exp.expense_date,
    payment_method: exp.payment_method,
  }));

  return (
    <FinanceClient
      revenue={revenue}
      cogs={cogs}
      gross={gross}
      expenseTotal={expenseTotal}
      initialExpenses={expenses}
    />
  );
}
