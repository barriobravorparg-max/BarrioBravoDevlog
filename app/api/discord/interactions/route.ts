import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import {
  buildUpdateEmbed,
  resolveChannelId,
  resolveRolePing,
  UpdateCategory,
} from "@/lib/discord/embed";
import { editOriginalResponse, sendToChannel } from "@/lib/discord/api";
import { generateUpdateText } from "@/lib/ai/generateUpdate";
import { generateBanner } from "@/lib/ai/generateBanner";
import { createDraft, getDraft, updateDraft, deleteDraft } from "@/lib/supabase/drafts";
import { logPublishedUpdate, logFailedUpdate } from "@/lib/supabase/devlog";

// El trabajo en segundo plano (IA + banner + Discord + Supabase) puede pasar
// los 10s por defecto del plan Hobby — le damos más margen.
export const maxDuration = 60;

const APP_ID = process.env.DISCORD_APP_ID!;
// Uno o más role IDs separados por coma (ej: "id1,id2") — cualquiera de esos
// roles puede correr /update.
const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// Discord Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
const MESSAGE_COMPONENT = 3;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  const isValid = verifyDiscordRequest(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === PING) {
    return NextResponse.json({ type: 1 });
  }

  if (interaction.type === APPLICATION_COMMAND) {
    return handleCommand(interaction);
  }

  if (interaction.type === MESSAGE_COMPONENT) {
    return handleButton(interaction);
  }

  return NextResponse.json({ error: "Tipo de interacción no soportado" }, { status: 400 });
}

// --- /update: valida permisos, respuesta diferida, dispara el trabajo async ---
function handleCommand(interaction: any) {
  // Control de permisos: además del default_member_permissions del comando,
  // chequeamos el rol de staff explícito por si el server tiene jerarquías propias.
  const memberRoles: string[] = interaction.member?.roles ?? [];
  if (STAFF_ROLE_IDS.length > 0 && !memberRoles.some((r) => STAFF_ROLE_IDS.includes(r))) {
    return NextResponse.json({
      type: 4,
      data: { content: "No tenés permiso para publicar actualizaciones.", flags: 64 },
    });
  }

  const options = Object.fromEntries(
    (interaction.data.options ?? []).map((o: any) => [o.name, o.value])
  );

  // El trabajo pesado (llamar a la IA) no puede terminar en <3s, así que
  // respondemos diferido ya mismo y seguimos procesando después. waitUntil
  // evita que Vercel congele la función serverless antes de que termine
  // este trabajo en segundo plano.
  waitUntil(
    processCommandAsync(interaction, options).catch((err) =>
      console.error("Error procesando /update:", err)
    )
  );

  return NextResponse.json({ type: 5, data: { flags: 64 } }); // deferred, ephemeral
}

async function processCommandAsync(interaction: any, options: any) {
  const category = options.categoria as UpdateCategory;
  const rawNotes = options.notas as string;
  const version = options.version as string | undefined;
  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  const userName = interaction.member?.user?.username ?? interaction.user?.username;

  try {
    const generated = await generateUpdateText({ category, rawNotes });
    const bannerUrl = await generateBanner(generated.description);

    const draftId = await createDraft({
      category,
      raw_notes: rawNotes,
      version: version ?? null,
      title: generated.title,
      description: generated.description,
      bullets: generated.bullets,
      banner_url: bannerUrl,
      created_by: userId,
      created_by_name: userName,
    });

    if (!draftId) throw new Error("No se pudo guardar el borrador");

    const embed = buildUpdateEmbed({
      category,
      title: generated.title,
      generatedText: generated.description,
      bulletPoints: generated.bullets,
      bannerUrl,
      version,
    });

    await editOriginalResponse(APP_ID, interaction.token, {
      content: "**Vista previa** — revisá antes de publicar:",
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 3, label: "Publicar", custom_id: `publish:${draftId}` },
            { type: 2, style: 2, label: "Regenerar", custom_id: `regenerate:${draftId}` },
            { type: 2, style: 4, label: "Cancelar", custom_id: `cancel:${draftId}` },
          ],
        },
      ],
    });
  } catch (err: any) {
    await logFailedUpdate({
      category,
      rawNotes,
      publishedBy: userId,
      publishedByName: userName,
      errorMessage: String(err?.message ?? err),
    });

    await editOriginalResponse(APP_ID, interaction.token, {
      content:
        "⚠️ Algo falló generando la actualización. Quedó registrado el intento — probá de nuevo en un momento.",
      embeds: [],
      components: [],
    });
  }
}

// --- Botones: Publicar / Regenerar / Cancelar ---
function handleButton(interaction: any) {
  const [action, draftId] = interaction.data.custom_id.split(":");

  waitUntil(
    processButtonAsync(interaction, action, draftId).catch((err) =>
      console.error("Error procesando botón:", err)
    )
  );

  return NextResponse.json({ type: 6 }); // deferred update message (sin nuevo mensaje)
}

async function processButtonAsync(interaction: any, action: string, draftId: string) {
  const draft = await getDraft(draftId);

  if (!draft) {
    await editOriginalResponse(APP_ID, interaction.token, {
      content: "Este borrador ya expiró o fue procesado.",
      components: [],
    });
    return;
  }

  if (action === "cancel") {
    await deleteDraft(draftId);
    await editOriginalResponse(APP_ID, interaction.token, {
      content: "Publicación cancelada.",
      embeds: [],
      components: [],
    });
    return;
  }

  if (action === "regenerate") {
    const generated = await generateUpdateText({
      category: draft.category,
      rawNotes: draft.raw_notes,
    });

    await updateDraft(draftId, {
      title: generated.title,
      description: generated.description,
      bullets: generated.bullets,
    });

    const embed = buildUpdateEmbed({
      category: draft.category,
      title: generated.title,
      generatedText: generated.description,
      bulletPoints: generated.bullets,
      bannerUrl: draft.banner_url,
      version: draft.version ?? undefined,
    });

    await editOriginalResponse(APP_ID, interaction.token, {
      content: "**Vista previa (regenerada)** — revisá antes de publicar:",
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 3, label: "Publicar", custom_id: `publish:${draftId}` },
            { type: 2, style: 2, label: "Regenerar", custom_id: `regenerate:${draftId}` },
            { type: 2, style: 4, label: "Cancelar", custom_id: `cancel:${draftId}` },
          ],
        },
      ],
    });
    return;
  }

  if (action === "publish") {
    const channelId = resolveChannelId(draft.category);
    const rolePing = resolveRolePing(draft.category);

    const embed = buildUpdateEmbed({
      category: draft.category,
      title: draft.title,
      generatedText: draft.description,
      bulletPoints: draft.bullets,
      bannerUrl: draft.banner_url,
      version: draft.version ?? undefined,
    });

    const res = await sendToChannel(process.env.DISCORD_BOT_TOKEN!, channelId, {
      content: rolePing ?? undefined,
      embeds: [embed],
    });

    if (!res.ok) {
      await logFailedUpdate({
        category: draft.category,
        rawNotes: draft.raw_notes,
        publishedBy: draft.created_by,
        publishedByName: draft.created_by_name,
        errorMessage: `Discord respondió ${res.status} al publicar`,
      });
      await editOriginalResponse(APP_ID, interaction.token, {
        content: "⚠️ No se pudo publicar en el canal. Quedó registrado el intento.",
        components: [],
      });
      return;
    }

    const message = await res.json();

    await logPublishedUpdate({
      category: draft.category,
      title: draft.title,
      rawNotes: draft.raw_notes,
      generatedText: draft.description,
      bannerUrl: draft.banner_url,
      discordMessageId: message.id,
      discordChannelId: channelId,
      publishedBy: draft.created_by,
      publishedByName: draft.created_by_name,
    });

    await deleteDraft(draftId);

    await editOriginalResponse(APP_ID, interaction.token, {
      content: "✅ Publicado en el canal.",
      embeds: [],
      components: [],
    });
  }
}
