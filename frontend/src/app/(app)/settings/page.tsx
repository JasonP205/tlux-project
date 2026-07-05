import { serverApi } from "@/lib/server-api";
import type { Settings } from "@/lib/types";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const initial = await serverApi<{ settings: Settings }>("/settings");
  return <SettingsClient initial={initial ?? undefined} />;
}
