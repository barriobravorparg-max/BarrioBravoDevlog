// Ejemplos de tono para que la IA no varíe de post en post.
// Sumá o cambiá estos ejemplos con posts reales una vez que tengas 2-3 publicados.
const BRAND_VOICE_EXAMPLES = `
Ejemplo 1 (feature):
"El garage de Vinewood ya está online. Podés comprar, guardar y retirar vehículos con el nuevo sistema de slots. Menos vueltas, más calle."

Ejemplo 2 (fix):
"Arreglamos el HUD que se superponía con el chat en resoluciones ultrawide. Gracias a los que lo reportaron en soporte."
`.trim();

interface GenerateUpdateParams {
  category: "feature" | "fix" | "evento";
  rawNotes: string;
}

interface GeneratedUpdate {
  title: string;
  description: string;
  bullets: string[];
}

/**
 * Llama a la API de Claude para convertir notas en bruto en un post pulido.
 * Devuelve JSON estructurado (título, descripción corta, bullets) para
 * que el embed quede prolijo sin depender de que la IA "adivine" el formato.
 */
export async function generateUpdateText({
  category,
  rawNotes,
}: GenerateUpdateParams): Promise<GeneratedUpdate> {
  const systemPrompt = `Sos el redactor de devlogs de Barrio Bravo RP, un servidor de roleplay FiveM/QBCore.
Tono: directo, cercano, con onda de barrio pero profesional. Sin exagerar con emojis (máximo 1-2 en toda la descripción).
Nunca uses relleno tipo "estamos emocionados de anunciar". Andá al grano.

${BRAND_VOICE_EXAMPLES}

Categoría de este post: ${category}.

Respondé ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta forma exacta:
{"title": "...", "description": "...", "bullets": ["...", "..."]}
- title: corto, sin repetir la palabra de la categoría
- description: 2-4 líneas, tono de marca
- bullets: 2-5 ítems concretos extraídos de las notas`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: rawNotes }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Anthropic API respondió ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title,
      description: parsed.description,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
