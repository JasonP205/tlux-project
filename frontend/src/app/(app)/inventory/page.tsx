import { serverApi } from "@/lib/server-api";
import type { InventoryBatch, Product } from "@/lib/types";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const [batches, alerts] = await Promise.all([
    serverApi<{ batches: InventoryBatch[] }>("/inventory/batches?limit=100"),
    serverApi<{
      expiringBatches: InventoryBatch[];
      lowStockProducts: (Product & { stock: number })[];
      outOfStockProducts: Product[];
    }>("/inventory/alerts"),
  ]);
  return <InventoryClient initialBatches={batches ?? undefined} initialAlerts={alerts ?? undefined} />;
}
