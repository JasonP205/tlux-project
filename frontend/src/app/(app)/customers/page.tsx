import { serverApi } from "@/lib/server-api";
import type { Customer } from "@/lib/types";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const initial = await serverApi<{ customers: Customer[] }>("/customers?q=&limit=100");
  return <CustomersClient initial={initial ?? undefined} />;
}
