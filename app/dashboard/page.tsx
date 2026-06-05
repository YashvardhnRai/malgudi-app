import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CEODashboard from "@/app/components/CEODashboard";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getDisplayNameFromEmail, isCeoEmail } from "@/lib/auth";

type UserProfile = {
  role: "CEO" | "MANAGER" | "STAFF";
  name: string | null;
};

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

  const { data: profile } = await getSupabaseServerClient()
    .from("users")
    .select("role, name")
    .eq("email", user.email)
    .maybeSingle<UserProfile>();

  if (profile?.role !== "CEO" && !isCeoEmail(user.email)) {
    redirect("/auth");
  }

  return (
    <CEODashboard
      userName={profile?.name || getDisplayNameFromEmail(user.email)}
    />
  );
}
