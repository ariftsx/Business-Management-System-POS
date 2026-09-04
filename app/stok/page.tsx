import { createClient } from "../../lib/supabase/server";
import StockClient, { type StockProduct, type StockMovement } from "./stock-client";

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data: productsData }, { data: movementsData }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, category, current_stock, minimum_stock, unit")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("stock_movements")
      .select("id, movement_type, quantity, stock_before, stock_after, reason, created_at, products(name, sku)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const products: StockProduct[] = (productsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    current_stock: Number(p.current_stock),
    minimum_stock: Number(p.minimum_stock),
    unit: p.unit,
  }));

  const movements: StockMovement[] = (movementsData ?? []).map((m) => {
    const prod = Array.isArray(m.products) ? m.products[0] : m.products;
    return {
      id: m.id,
      movement_type: m.movement_type,
      quantity: Number(m.quantity),
      stock_before: Number(m.stock_before),
      stock_after: Number(m.stock_after),
      reason: m.reason,
      created_at: m.created_at,
      products: prod ? { name: prod.name, sku: prod.sku } : null,
    };
  });

  return <StockClient initialProducts={products} initialMovements={movements} />;
}
