import { serverApi } from "@/lib/server-api";
import type { Category, Product } from "@/lib/types";
import ProductsClient, { PAGE_SIZE } from "./ProductsClient";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category ?? "";
  const [products, categories] = await Promise.all([
    serverApi<{ products: Product[]; total: number }>(
      `/products?limit=${PAGE_SIZE}&page=${page}&q=&category=${encodeURIComponent(category)}`
    ),
    serverApi<{ categories: Category[] }>("/categories"),
  ]);
  return (
    <ProductsClient
      page={page}
      category={category}
      initialProducts={products ?? undefined}
      initialCategories={categories ?? undefined}
    />
  );
}
