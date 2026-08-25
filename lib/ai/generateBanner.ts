import { uploadBannerImage } from "@/lib/supabase/storage";

/**
 * Genera una imagen de portada acorde al contenido del update usando la API
 * de imágenes de OpenAI (dall-e-3), y la sube a Supabase Storage para tener
 * una URL pública y permanente — la que devuelve OpenAI es temporal y se
 * rompería en el historial del /changelog.
 *
 * Queda desactivado (devuelve null) hasta que completes OPENAI_API_KEY.
 * Si lo dejás vacío, el embed usa el logo como thumbnail únicamente
 * (ver lib/discord/embed.ts).
 */
export async function generateBanner(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Banner de devlog para un servidor de GTA RP llamado Barrio Bravo. ${prompt}. Estilo urbano, paleta coral/púrpura/cyan, sin texto superpuesto.`,
        size: "1792x1024",
        quality: "standard",
        response_format: "b64_json",
        n: 1,
      }),
    });

    if (!res.ok) {
      console.error("Error generando banner con OpenAI:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;

    return await uploadBannerImage(b64);
  } catch (err) {
    // Si falla la generación de imagen, no debe tumbar la publicación del update
    console.error("Error generando banner:", err);
    return null;
  }
}
