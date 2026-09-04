import { createClient } from "../../lib/supabase/server";
import TransactionsClient, { type TransactionListItem } from "./transactions-client";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: transactionsData } = await supabase
    .from("sales_transactions")
    .select("id, transaction_number, status, payment_method, total, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const transactions: TransactionListItem[] = (transactionsData ?? []).map((t) => ({
    id: t.id,
    transaction_number: t.transaction_number,
    status: t.status,
    payment_method: t.payment_method,
    total: Number(t.total || 0),
    created_at: t.created_at,
  }));

  return <TransactionsClient initialTransactions={transactions} />;
}
