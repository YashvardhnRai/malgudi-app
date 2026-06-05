import { redirect } from "next/navigation";
import { isSupabaseConfigured, getSupabaseServerClient } from "@/lib/supabase";
import { getMockDashboard } from "@/lib/mock-data";

async function getFirstOutletId() {
  if (!isSupabaseConfigured) {
    return getMockDashboard().outlets[0]?.id ?? null;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("outlets")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();

    return data?.id ?? getMockDashboard().outlets[0]?.id ?? null;
  } catch {
    return getMockDashboard().outlets[0]?.id ?? null;
  }
}

export default async function ManagerIndexPage() {
  const outletId = await getFirstOutletId();
  redirect(outletId ? `/manager/${outletId}` : "/auth");
}
