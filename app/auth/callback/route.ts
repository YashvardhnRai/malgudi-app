import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isCeoEmail } from "@/lib/auth";

type UserProfile = {
  role: "CEO" | "MANAGER" | "STAFF";
  name: string | null;
  outlet_id: string | null;
};

export async function GET(req: NextRequest) {
  console.log("CALLBACK HIT");
  console.log("URL:", req.url);

  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  console.log("Code:", code ? "YES" : "NO");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?error=no_code`
    );
  }

  // Create the redirect response FIRST
  // so we can write cookies onto it
  const response = NextResponse.redirect(
    `${origin}${next}`
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name, value, options
              );
            }
          );
        },
      },
    }
  );

  const { error } = await supabase
    .auth.exchangeCodeForSession(code);

  console.log("Exchange error:", error?.message);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth?error=auth_failed&msg=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("User:", user?.email);

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/auth?error=no_user`);
  }

  const { data: profile } = await getSupabaseServerClient()
    .from("users")
    .select("role, name, outlet_id")
    .eq("email", user.email)
    .maybeSingle<UserProfile>();

  let destination = new URL(next, origin);

  if (profile?.role === "MANAGER" && profile.outlet_id) {
    destination = new URL(`/manager/${profile.outlet_id}`, origin);
  } else if (profile?.role === "CEO" || isCeoEmail(user.email)) {
    destination = new URL("/dashboard", origin);
  }

  console.log("Profile:", profile);
  console.log("Redirecting to:", destination.toString());

  response.headers.set("Location", destination.toString());

  return response;
}
