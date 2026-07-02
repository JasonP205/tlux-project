import { serverApi } from "@/lib/server-api";
import type { DiscountCode } from "@/lib/types";
import DiscountsClient from "./DiscountsClient";

export default async function DiscountsPage() {
  const initial = await serverApi<{ discounts: DiscountCode[] }>("/discounts");
  return <DiscountsClient initial={initial ?? undefined} />;
}
