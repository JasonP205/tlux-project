import { serverApi } from "@/lib/server-api";
import type { Customer, Order } from "@/lib/types";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initial = await serverApi<{ customer: Customer; orders: Order[]; totalSpent: number }>(
    `/customers/${id}`
  );
  return <CustomerDetailClient id={id} initial={initial ?? undefined} />;
}
