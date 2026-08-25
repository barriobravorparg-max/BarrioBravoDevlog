import { createClient } from "@supabase/supabase-js";

// Service role: solo se usa server-side (API routes), nunca en el cliente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogPublishedParams {
  category: string;
  title: string;
  rawNotes: string;
  generatedText: string;
  bannerUrl: string | null;
  discordMessageId: string;
  discordChannelId: string;
  publishedBy: string;
  publishedByName: string;
}

export async function logPublishedUpdate(params: LogPublishedParams) {
  const { error } = await supabase.from("devlog").insert({
    category: params.category,
    title: params.title,
    raw_notes: params.rawNotes,
    generated_text: params.generatedText,
    banner_url: params.bannerUrl,
    discord_message_id: params.discordMessageId,
    discord_channel_id: params.discordChannelId,
    published_by: params.publishedBy,
    published_by_name: params.publishedByName,
    status: "published",
  });

  if (error) console.error("Error guardando devlog en Supabase:", error);
}

interface LogFailedParams {
  category: string;
  rawNotes: string;
  publishedBy: string;
  publishedByName: string;
  errorMessage: string;
}

export async function logFailedUpdate(params: LogFailedParams) {
  const { error } = await supabase.from("devlog").insert({
    category: params.category,
    title: "(falló antes de generar título)",
    raw_notes: params.rawNotes,
    generated_text: "",
    published_by: params.publishedBy,
    published_by_name: params.publishedByName,
    status: "failed",
    error_message: params.errorMessage,
  });

  if (error) console.error("Error guardando fallo en Supabase:", error);
}

/** Usado por la página pública /changelog */
export async function getPublishedUpdates(limit = 30) {
  const { data, error } = await supabase
    .from("devlog")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error leyendo devlog:", error);
    return [];
  }

  return data;
}
