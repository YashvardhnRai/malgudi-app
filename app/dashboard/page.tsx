import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CEODashboard from "@/app/components/CEODashboard";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Cannot set cookies in Server Component
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profiles } = await supabase
    .from("users")
    .select("role, name")
    .eq("email", user.email);

  const profile = profiles?.[0];

  if (!profile || profile.role !== "CEO") {
    redirect("/auth");
  }

  return <CEODashboard userName={profile.name || "Team"} />;
}
