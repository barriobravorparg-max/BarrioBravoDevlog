import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "devlog-banners";

/**
 * Sube un banner (base64) a Supabase Storage y devuelve la URL pública.
 * Las URLs que devuelven las APIs de generación de imágenes son temporales,
 * así que re-hosteamos acá para que el /changelog no se rompa con el tiempo.
 */
export async function uploadBannerImage(base64: string): Promise<string | null> {
  const buffer = Buffer.from(base64, "base64");
  const filename = `${randomUUID()}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: "image/png" });

  if (error) {
    console.error("Error subiendo banner a Supabase Storage:", error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
