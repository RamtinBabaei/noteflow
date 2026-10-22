import { z } from 'zod';

export const noteInput = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give your note a title.')
      .max(120, 'Keep the title under 120 characters.'),
    content: z.string().max(50000, 'Keep your note under 50,000 characters.'),
    tags: z
      .array(z.string().trim().min(1).max(24))
      .max(12)
      .transform((tags) => [...new Map(tags.map((tag) => [tag.toLowerCase(), tag])).values()]),
    archived: z.boolean().default(false),
  })
  .strict();
export const noteUpdate = noteInput.extend({ version: z.number().int().min(1) });
export type NoteInput = z.infer<typeof noteInput>;
export interface Note extends NoteInput {
  id: string;
  updatedAt: string;
  createdAt: string;
  version: number;
}
export type View = 'all' | 'archive' | 'tag' | 'search' | 'settings' | 'tags';
export function parseTags(text: string) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
export function filterNotes(notes: Note[], view: View, tag: string, query: string) {
  const search = query.trim().toLocaleLowerCase();
  return notes
    .filter((note) => {
      if (view !== 'search' && (view === 'archive' ? !note.archived : note.archived)) return false;
      if (
        view === 'tag' &&
        !note.tags.some((t) => t.toLocaleLowerCase() === tag.toLocaleLowerCase())
      )
        return false;
      return (
        !search ||
        [note.title, note.content, ...note.tags].some((s) => s.toLocaleLowerCase().includes(search))
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}
export function allTags(notes: Note[]) {
  return [...new Set(notes.filter((n) => !n.archived).flatMap((n) => n.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}
export function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/u).length : 0;
}
