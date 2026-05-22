import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("=== CALLBACK HIT ===");
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  console.log("Full URL:", req.url);
  console.log("Origin:", origin);
  console.log("Code received:", code ? "YES" : "NO");

  if (!code) {
    console.log("No code — redirecting to /auth");
    return NextResponse.redirect(new URL("/auth", origin));
  }

  // Build the response object first so session cookies are written onto it
  // (cookieStore.set() in a Route Handler may not attach to a separate redirect)
  let redirectUrl = new URL("/dashboard", origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          console.log("Setting cookies:", cookiesToSet.map(c => c.name));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  console.log("Exchange error:", error?.message ?? "none");

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/auth?error=callback_failed", origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  console.log("User after exchange:", user?.email ?? "null");

  if (!user) {
    console.log("No user — redirecting to /auth");
    return NextResponse.redirect(new URL("/auth", origin));
  }

  const { data: profiles } = await supabase
    .from("users")
    .select("role, name, outlet_id")
    .eq("email", user.email);

  console.log("All profiles found:", profiles);
  console.log("User email from auth:", user.email);
  console.log("Profiles count:", profiles?.length);

  const profile = profiles?.[0];

  if (profile?.role === "CEO") {
    console.log("Role=CEO — redirecting to /dashboard");
    redirectUrl = new URL("/dashboard", origin);
  } else if (profile?.role === "MANAGER") {
    console.log("Role=MANAGER — redirecting to /manager/" + profile.outlet_id);
    redirectUrl = new URL(`/manager/${profile.outlet_id}`, origin);
  } else {
    console.log("No role match — fallback to /dashboard. Profile:", profile);
    redirectUrl = new URL("/dashboard", origin);
  }

  // Update the redirect URL on the same response object (cookies already attached)
  return NextResponse.redirect(redirectUrl, {
    headers: response.headers,
  });
}
