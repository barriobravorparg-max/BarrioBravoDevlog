# Bot de Devlog — Barrio Bravo RP

Publica actualizaciones del servidor en Discord con un slash command `/update`,
usando IA para pulir el texto. Corre 100% serverless dentro de tu proyecto
Next.js en Vercel — no hay ningún proceso de bot corriendo 24/7.

## Qué incluye

- Vista previa ephemeral antes de publicar (botones Publicar / Regenerar / Cancelar)
- Ruteo automático a distintos canales según categoría (feature / fix / evento)
- Control de permisos por rol de Discord
- Log de cada publicación (y de cada fallo) en Supabase
- Changelog público en `/changelog` que se sincroniza solo
- Reintentos automáticos si Discord o la IA fallan
- Banner generado con la API de imágenes de OpenAI (opcional, desactivado por defecto)

## Setup

### 1. Dependencias

```bash
npm install
```

### 2. Discord Developer Portal

1. Creá una Application en https://discord.com/developers/applications
2. Andá a **Bot** → creá el bot → copiá el token (`DISCORD_BOT_TOKEN`)
3. En **General Information** copiá el `APPLICATION ID` (`DISCORD_APP_ID`)
   y la `PUBLIC KEY` (`DISCORD_PUBLIC_KEY`)
4. Invitá el bot a tu server con permisos `Send Messages`, `Embed Links` y
   `Use Application Commands` en los canales donde va a postear
5. En **General Information** → **Interactions Endpoint URL**, una vez que
   tengas el proyecto deployado en Vercel, poné:
   `https://tu-dominio.vercel.app/api/discord/interactions`
   (Discord hace un ping de verificación ahí mismo — el endpoint ya lo maneja)

### 3. Variables de entorno

Copiá `.env.example` a `.env.local` y completá todo. `DISCORD_STAFF_ROLE_ID`
es el rol que puede correr `/update` — lo sacás de Discord con modo desarrollador
activado, clic derecho en el rol → "Copiar ID".

### 4. Supabase

Corré las migraciones en el SQL editor de Supabase, en este orden:

```bash
sql/001_devlog.sql
sql/002_devlog_drafts.sql
sql/003_devlog_banners_bucket.sql   # sólo si vas a usar el banner con IA (ver más abajo)
```

### 5. Registrar el slash command

Una sola vez (o cada vez que cambies las opciones del comando):

```bash
npm run register-commands
```

### 6. Deploy

Con las env vars cargadas en Vercel, el endpoint queda funcionando solo.

## Desarrollo local

```bash
npm run dev
```

Corre en `http://localhost:3000`. `/` y `/changelog` se pueden ver sin
configurar nada (el changelog muestra "Todavía no hay actualizaciones" si
Supabase no está configurado). Para probar el endpoint de Discord
(`/api/discord/interactions`) hace falta simular la firma Ed25519 que Discord
manda en cada request — no se puede pegarle directo con un POST cualquiera.

## Uso

```
/update categoria:Feature notas:"agregué el garage de Vinewood, arreglé el HUD" version:v0.4.2
```

El bot te muestra un preview privado (solo vos lo ves) con el embed generado.
Desde ahí: **Publicar** lo manda al canal correspondiente, **Regenerar** vuelve
a pedirle a la IA que lo reescriba, **Cancelar** descarta el borrador.

## Personalización

- **Tono de la IA**: editá `BRAND_VOICE_EXAMPLES` en `lib/ai/generateUpdate.ts`
  con 2-3 posts reales una vez que tengas algunos publicados
- **Colores/categorías**: `lib/discord/embed.ts` — `CATEGORY_CONFIG`
- **Banner automático**: completá `OPENAI_API_KEY` en el `.env.local` (usa
  `dall-e-3`). La imagen se sube a un bucket público de Supabase Storage
  (`devlog-banners`, creado por `sql/003_devlog_banners_bucket.sql`) para
  tener una URL permanente — la que devuelve OpenAI expira y rompería el
  historial del `/changelog`. Si dejás `OPENAI_API_KEY` vacío, el embed usa
  el logo como thumbnail y listo
- **Limpieza de borradores viejos**: los registros de `devlog_drafts` son de
  corta vida — si querés, agregá un cron de Supabase que borre los de más
  de 1 día
