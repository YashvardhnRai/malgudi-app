import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { photoId, photoUrl, category } = await req.json();

  try {
    // Fetch image
    const imageRes = await fetch(photoUrl);
    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

    // Ask Haiku to review the photo
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: `You are a restaurant quality inspector for Malgudi, a South Indian restaurant chain.

Review this ${category} photo and respond with JSON only:
{
  "status": "APPROVED" or "FLAGGED",
  "notes": "one sentence explanation if flagged, empty string if approved",
  "issues": [] or ["issue1", "issue2"]
}

Flag if you see: dirty surfaces, stale or unappetizing food, improper presentation, low food levels, missing items, unhygienic conditions, or anything that would concern a restaurant owner.

Respond with JSON only. No other text.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";

    let result = { status: "APPROVED", notes: "", issues: [] as string[] };
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      // Keep defaults if parse fails
    }

    if (!isSupabaseConfigured) {
      return Response.json({ ok: true, ...result });
    }

    // Update photo in database
    const supabase = getSupabaseServerClient();
    await supabase
      .from("photo_uploads")
      .update({
        ai_status: result.status,
        ai_notes: result.notes,
      })
      .eq("id", photoId);

    // Create alert if flagged
    if (result.status === "FLAGGED") {
      const { data: photo } = await supabase
        .from("photo_uploads")
        .select("outlet_id")
        .eq("id", photoId)
        .single();

      if (photo) {
        await supabase.from("alerts").insert({
          outlet_id: photo.outlet_id,
          alert_type: "PHOTO_FLAGGED",
          message: `AI flagged a ${category} photo: ${result.notes}`,
          severity: "HIGH",
          is_read: false,
        });
      }
    }

    return Response.json({ ok: true, ...result });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message });
  }
}
