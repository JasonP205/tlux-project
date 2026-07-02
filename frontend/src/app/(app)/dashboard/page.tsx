import { serverApi } from "@/lib/server-api";
import DashboardClient, { type Stats } from "./DashboardClient";

export default async function DashboardPage() {
  const initial = await serverApi<Stats>("/orders/stats");
  return <DashboardClient initial={initial ?? undefined} />;
}
