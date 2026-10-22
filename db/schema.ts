import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    owner: text('owner')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    tags: text('tags').notNull(),
    archived: integer('archived').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (table) => [index('notes_owner_updated').on(table.owner, table.updatedAt)],
);
export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey(),
  count: integer('count').notNull(),
  expires: integer('expires').notNull(),
});
