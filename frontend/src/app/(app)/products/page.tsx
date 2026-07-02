import { serverApi } from "@/lib/server-api";
import type { Category, Product } from "@/lib/types";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    serverApi<{ products: Product[]; total: number }>("/products?limit=100&q=&category="),
    serverApi<{ categories: Category[] }>("/categories"),
  ]);
  return (
    <ProductsClient initialProducts={products ?? undefined} initialCategories={categories ?? undefined} />
  );
}
