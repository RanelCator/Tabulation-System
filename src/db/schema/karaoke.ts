// src/db/schema.ts
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const queueItemStatusEnum = pgEnum("queue_item_status", [
  "queued",
  "playing",
  "played",
  "skipped",
  "removed",
]);

export const karaokeSessions = pgTable("karaoke_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const karaokeQueueItems = pgTable(
  "karaoke_queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    sessionId: uuid("session_id")
      .notNull()
      .references(() => karaokeSessions.id, { onDelete: "cascade" }),

    singerName: text("singer_name").notNull(),

    youtubeUrl: text("youtube_url").notNull(),
    youtubeVideoId: text("youtube_video_id").notNull(),

    title: text("title"),
    thumbnailUrl: text("thumbnail_url"),

    queueNumber: integer("queue_number").notNull(),

    status: queueItemStatusEnum("status").notNull().default("queued"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    playedAt: timestamp("played_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueQueueNumberPerSession: unique().on(
      table.sessionId,
      table.queueNumber,
    ),
  }),
);

export const karaokePlaybackState = pgTable("karaoke_playback_state", {
  id: uuid("id").defaultRandom().primaryKey(),

  sessionId: uuid("session_id")
    .notNull()
    .references(() => karaokeSessions.id, { onDelete: "cascade" })
    .unique(),

  currentQueueItemId: uuid("current_queue_item_id").references(
    () => karaokeQueueItems.id,
    { onDelete: "set null" },
  ),

  isPlaying: boolean("is_playing").notNull().default(false),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});