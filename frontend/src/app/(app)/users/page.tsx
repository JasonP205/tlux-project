import { serverApi } from "@/lib/server-api";
import type { User } from "@/lib/types";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const initial = await serverApi<{ users: User[] }>("/users");
  return <UsersClient initial={initial ?? undefined} />;
}
