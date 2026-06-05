import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { isCeoEmail } from "@/lib/auth";
import type { User } from "@/lib/types";

type CreateUserBody = {
  name?: string;
  email?: string;
  phone?: string;
  role?: "MANAGER" | "STAFF";
  outlet_id?: string;
};

function getRedirectTo(request: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return `${siteUrl.replace(/\/$/, "")}/auth/callback`;
}

async function requireCeoAccess() {
  if (!isSupabaseConfigured) {
    return null;
  }

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
          // API route cannot mutate the caller's auth cookies here.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Authentication required", users: [] }, { status: 401 });
  }

  if (isCeoEmail(user.email)) {
    return null;
  }

  const { data: profile } = await getSupabaseServerClient()
    .from("users")
    .select("role")
    .eq("email", user.email)
    .maybeSingle<{ role: "CEO" | "MANAGER" | "STAFF" }>();

  if (profile?.role === "CEO") {
    return null;
  }

  return NextResponse.json({ error: "CEO access required", users: [] }, { status: 403 });
}

export async function GET() {
  const denied = await requireCeoAccess();
  if (denied) return denied;

  if (!isSupabaseConfigured) {
    return NextResponse.json({ users: [] });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message, users: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireCeoAccess();
  if (denied) return denied;

  const body = (await request.json()) as CreateUserBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();

  if (!name || !email || !body.role || !body.outlet_id) {
    return NextResponse.json(
      { error: "Name, email, role, and outlet are required." },
      { status: 400 }
    );
  }

  const row = {
    name,
    email,
    phone: body.phone?.trim() || null,
    role: body.role,
    outlet_id: body.outlet_id,
  } satisfies Omit<User, "id" | "created_at">;

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      {
        user: {
          id: `demo-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...row,
        },
      },
      { status: 201 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: getRedirectTo(request) }
    );

    return NextResponse.json(
      {
        user: data,
        inviteWarning: inviteError?.message ?? null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
