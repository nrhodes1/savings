import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { seedState } from "@/lib/seed";
import type { HouseholdState } from "@/lib/types";

const ROW_ID = "singleton";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data: row, error } = await supabase
    .from("household_state")
    .select("data, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    const seed = seedState();
    const { data: created, error: insertError } = await supabase
      .from("household_state")
      .insert({ id: ROW_ID, data: seed })
      .select("data, updated_at")
      .single();

    if (insertError || !created) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to seed state." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: created.data, updatedAt: created.updated_at });
  }

  return NextResponse.json({ data: row.data, updatedAt: row.updated_at });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { data: HouseholdState; baseUpdatedAt: string }
    | null;

  if (!body || !body.data || !body.baseUpdatedAt) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: current, error: fetchError } = await supabase
    .from("household_state")
    .select("updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (current && current.updated_at !== body.baseUpdatedAt) {
    const { data: fresh } = await supabase
      .from("household_state")
      .select("data, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();
    return NextResponse.json(
      { data: fresh?.data, updatedAt: fresh?.updated_at },
      { status: 409 },
    );
  }

  const { data: saved, error: upsertError } = await supabase
    .from("household_state")
    .upsert({ id: ROW_ID, data: body.data, updated_at: new Date().toISOString() })
    .select("data, updated_at")
    .single();

  if (upsertError || !saved) {
    return NextResponse.json(
      { error: upsertError?.message ?? "Failed to save." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: saved.data, updatedAt: saved.updated_at });
}
