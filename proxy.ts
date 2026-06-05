import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isCeoEmail } from "@/lib/auth";

type UserProfile = {
  role: "CEO" | "MANAGER" | "STAFF";
  outlet_id: string | null;
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return response;
  }

  if (isCeoEmail(user.email)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { data: userRow } = await getSupabaseServerClient()
    .from("users")
    .select("role, outlet_id")
    .eq("email", user.email)
    .maybeSingle<UserProfile>();

  if (userRow?.role === "CEO") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (userRow?.role === "MANAGER" && userRow.outlet_id) {
    return NextResponse.redirect(
      new URL(`/manager/${userRow.outlet_id}`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/"],
};
