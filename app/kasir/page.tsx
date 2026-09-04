import { createClient } from "../../lib/supabase/server";
import CashierClient, { type CashierProduct } from "./cashier-client";

export default async function CashierPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, name, selling_price, current_stock, category, image_url").eq("is_active", true).gt("current_stock", 0).order("name");
  const products: CashierProduct[] = (data ?? []).map((product) => ({ id: product.id, name: product.name, price: Number(product.selling_price), stock: Number(product.current_stock), category: product.category, imageUrl: product.image_url ?? null }));
  return <CashierClient products={products} />;
}
