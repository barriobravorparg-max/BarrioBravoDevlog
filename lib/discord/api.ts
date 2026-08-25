const DISCORD_API = "https://discord.com/api/v10";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeoutMs = 8000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      // 429 (rate limit) o 5xx: reintentar con backoff
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after")) || 1;
        await new Promise((r) => setTimeout(r, retryAfter * 1000 * (attempt + 1)));
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("No se pudo completar la request a Discord tras los reintentos");
}

/** Respuesta diferida (ACK) — hay que responder en menos de 3s, esto compra tiempo */
export function deferredResponse(ephemeral = true) {
  return {
    type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    data: ephemeral ? { flags: 64 } : undefined,
  };
}

/** Edita la respuesta diferida (el preview ephemeral con botones) */
export async function editOriginalResponse(
  appId: string,
  interactionToken: string,
  body: Record<string, unknown>
) {
  return fetchWithRetry(
    `${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

/** Publica el mensaje final en el canal correspondiente (al confirmar) */
export async function sendToChannel(
  botToken: string,
  channelId: string,
  body: Record<string, unknown>
) {
  return fetchWithRetry(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Registra el slash command /update, restringido por defecto a Administrador */
export async function registerUpdateCommand(appId: string, botToken: string) {
  const command = {
    name: "update",
    description: "Publicar una actualización del servidor",
    default_member_permissions: String(1 << 3), // Administrator — ajustable por rol en el server
    options: [
      {
        name: "categoria",
        description: "Tipo de actualización",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "Feature", value: "feature" },
          { name: "Fix", value: "fix" },
          { name: "Evento", value: "evento" },
        ],
      },
      {
        name: "notas",
        description: "Notas en bruto de lo que cambió",
        type: 3,
        required: true,
      },
      {
        name: "version",
        description: "Versión del build (opcional, ej: v0.4.2)",
        type: 3,
        required: false,
      },
    ],
  };

  return fetchWithRetry(`${DISCORD_API}/applications/${appId}/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
}
