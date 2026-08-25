// Correr una vez (o cada vez que cambies las opciones del comando):
//   npx tsx scripts/register-commands.ts
import { config } from "dotenv";
import { registerUpdateCommand } from "../lib/discord/api";

// Next.js usa .env.local para secretos locales; dotenv por defecto sólo lee
// .env, así que lo apuntamos explícitamente para no leer variables vacías.
config({ path: ".env.local" });

async function main() {
  const res = await registerUpdateCommand(
    process.env.DISCORD_APP_ID!,
    process.env.DISCORD_BOT_TOKEN!
  );

  if (!res.ok) {
    console.error("Error registrando comando:", res.status, await res.text());
    process.exit(1);
  }

  console.log("Comando /update registrado correctamente ✅");
}

main();
