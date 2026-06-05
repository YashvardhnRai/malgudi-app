import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
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

export async function GET() {
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
