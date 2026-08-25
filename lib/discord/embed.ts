export type UpdateCategory = "feature" | "fix" | "evento";

// Paleta de marca de Barrio Bravo en decimal (Discord no acepta hex directo)
const CATEGORY_CONFIG: Record<
  UpdateCategory,
  { emoji: string; label: string; color: number; channelEnv: string; rolePingEnv?: string }
> = {
  feature: {
    emoji: "🚀",
    label: "Nueva actualización",
    color: 0xff6b8a, // coral
    channelEnv: "DISCORD_CHANNEL_FEATURE",
  },
  fix: {
    emoji: "🛠️",
    label: "Corrección",
    color: 0x5fc0c0, // cyan de la paleta
    channelEnv: "DISCORD_CHANNEL_FIX",
  },
  evento: {
    emoji: "🎉",
    label: "Evento",
    color: 0x9b5fc0, // púrpura
    channelEnv: "DISCORD_CHANNEL_EVENTO",
    rolePingEnv: "DISCORD_ROLE_PING_EVENTO",
  },
};

export function getCategoryConfig(category: UpdateCategory) {
  return CATEGORY_CONFIG[category];
}

export function resolveChannelId(category: UpdateCategory): string {
  const cfg = CATEGORY_CONFIG[category];
  return (
    process.env[cfg.channelEnv] ||
    process.env.DISCORD_CHANNEL_DEFAULT ||
    ""
  );
}

export function resolveRolePing(category: UpdateCategory): string | null {
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg.rolePingEnv) return null;
  const roleId = process.env[cfg.rolePingEnv];
  return roleId ? `<@&${roleId}>` : null;
}

interface BuildEmbedParams {
  category: UpdateCategory;
  title: string;
  generatedText: string;
  bulletPoints?: string[];
  bannerUrl?: string | null;
  version?: string;
}

/**
 * Arma el JSON del embed con logo como author, banner grande (si hay),
 * campos estructurados y footer con versión/fecha.
 */
export function buildUpdateEmbed({
  category,
  title,
  generatedText,
  bulletPoints,
  bannerUrl,
  version,
}: BuildEmbedParams) {
  const cfg = getCategoryConfig(category);
  const logoUrl = process.env.BARRIO_BRAVO_LOGO_URL;

  const embed: Record<string, unknown> = {
    author: {
      name: "Barrio Bravo RP",
      icon_url: logoUrl,
    },
    title: `${cfg.emoji} ${title || cfg.label}`,
    description: generatedText,
    color: cfg.color,
    thumbnail: logoUrl ? { url: logoUrl } : undefined,
    footer: {
      text: version ? `Devlog · Barrio Bravo RP · ${version}` : "Devlog · Barrio Bravo RP",
    },
    timestamp: new Date().toISOString(),
  };

  if (bannerUrl) {
    embed.image = { url: bannerUrl };
  }

  if (bulletPoints && bulletPoints.length > 0) {
    embed.fields = [
      {
        name: "Qué cambió",
        value: bulletPoints.map((b) => `✅ ${b}`).join("\n"),
      },
    ];
  }

  return embed;
}
