import { createClient } from "@supabase/supabase-js";
import type { UpdateCategory } from "../discord/embed";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DevlogDraft {
  id: string;
  category: UpdateCategory;
  raw_notes: string;
  version: string | null;
  title: string;
  description: string;
  bullets: string[];
  banner_url: string | null;
  created_by: string;
  created_by_name: string;
}

export async function createDraft(
  draft: Omit<DevlogDraft, "id">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("devlog_drafts")
    .insert(draft)
    .select("id")
    .single();

  if (error) {
    console.error("Error creando draft:", error);
    return null;
  }
  return data.id;
}

export async function getDraft(id: string): Promise<DevlogDraft | null> {
  const { data, error } = await supabase
    .from("devlog_drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as DevlogDraft;
}

export async function updateDraft(
  id: string,
  patch: Partial<Omit<DevlogDraft, "id">>
) {
  await supabase.from("devlog_drafts").update(patch).eq("id", id);
}

export async function deleteDraft(id: string) {
  await supabase.from("devlog_drafts").delete().eq("id", id);
}
