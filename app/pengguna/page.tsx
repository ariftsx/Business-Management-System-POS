import { createClient } from "../../lib/supabase/server";
import UsersClient, { type UserProfileItem } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  const profiles: UserProfileItem[] = (profilesData ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role as "SUPER_ADMIN" | "USER",
    is_active: p.is_active,
    created_at: p.created_at,
  }));

  return <UsersClient initialProfiles={profiles} />;
}
