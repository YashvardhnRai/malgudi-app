import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OutletDetail from "../../components/OutletDetail";

export default async function OutletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const today = new Date().toISOString().split("T")[0];

  const { data: outlet } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .single();

  if (!outlet) redirect("/");

  const { data: photos } = await supabase
    .from("photo_uploads")
    .select("*")
    .eq("outlet_id", id)
    .gte("created_at", today + "T00:00:00")
    .order("created_at", { ascending: false });

  const { data: complaints } = await supabase
    .from("complaints")
    .select("*")
    .eq("outlet_id", id)
    .order("reported_at", { ascending: false });

  const { data: sales } = await supabase
    .from("daily_sales")
    .select("*")
    .eq("outlet_id", id)
    .eq("date", today)
    .single();

  const { data: checklists } = await supabase
    .from("checklist_submissions")
    .select("*")
    .eq("outlet_id", id)
    .gte("created_at", today + "T00:00:00")
    .order("created_at", { ascending: false });

  const { data: manager } = await supabase
    .from("users")
    .select("name, phone, email")
    .eq("outlet_id", id)
    .eq("role", "MANAGER")
    .single();

  return (
    <OutletDetail
      outlet={outlet}
      photos={photos || []}
      complaints={complaints || []}
      sales={sales || null}
      checklists={checklists || []}
      manager={manager || null}
    />
  );
}
