import { serverApi } from "@/lib/server-api";
import type { Order } from "@/lib/types";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage() {
  const initial = await serverApi<{ orders: Order[]; total: number }>("/orders?limit=100&status=");
  return <OrdersClient initial={initial ?? undefined} />;
}
