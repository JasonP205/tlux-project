import { serverApi } from "@/lib/server-api";
import type { Product } from "@/lib/types";
import BarcodesClient from "./BarcodesClient";

export default async function BarcodesPage() {
  const initial = await serverApi<{ products: Product[] }>("/products?limit=100");
  return <BarcodesClient initial={initial ?? undefined} />;
}
