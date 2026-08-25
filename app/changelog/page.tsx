import { getPublishedUpdates } from "@/lib/supabase/devlog";

const CATEGORY_LABEL: Record<string, string> = {
  feature: "🚀 Feature",
  fix: "🛠️ Fix",
  evento: "🎉 Evento",
};

export const revalidate = 60; // ISR: se refresca solo, sin trabajo manual

export default async function ChangelogPage() {
  const updates = await getPublishedUpdates();

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Changelog</h1>
      <p className="text-neutral-500 mb-10">
        Todo lo que va cambiando en Barrio Bravo, directo desde Discord.
      </p>

      <div className="space-y-8">
        {updates.map((u) => (
          <article key={u.id} className="border-l-2 border-neutral-200 pl-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <span>{CATEGORY_LABEL[u.category] ?? u.category}</span>
              <span>·</span>
              <time>{new Date(u.created_at).toLocaleDateString("es-AR")}</time>
            </div>
            <h2 className="text-lg font-semibold">{u.title}</h2>
            <p className="text-neutral-700 mt-1 whitespace-pre-line">
              {u.generated_text}
            </p>
            {u.banner_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.banner_url}
                alt=""
                className="mt-3 rounded-lg border border-neutral-200"
              />
            )}
          </article>
        ))}

        {updates.length === 0 && (
          <p className="text-neutral-400">Todavía no hay actualizaciones publicadas.</p>
        )}
      </div>
    </main>
  );
}
