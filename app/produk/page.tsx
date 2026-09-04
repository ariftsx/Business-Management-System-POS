import { createClient } from "../../lib/supabase/server";
import ProductsClient, { type Product } from "./products-client";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, category, selling_price, cost_price, current_stock, minimum_stock, unit, image_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const products: Product[] = (data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: Number(product.selling_price),
    cost: Number(product.cost_price),
    stock: Number(product.current_stock),
    minStock: Number(product.minimum_stock || 0),
    unit: product.unit,
    imageUrl: product.image_url ?? null,
  }));

  return <ProductsClient initialProducts={products} />;
}
