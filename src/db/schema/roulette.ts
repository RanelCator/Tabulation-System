import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const rouletteSessionStatusEnum = pgEnum("roulette_session_status", [
  "draft",
  "active",
  "closed",
]);

export const rouletteDrawModeEnum = pgEnum("roulette_draw_mode", [
  "random",
  "predetermined",
]);

export const rouletteSessions = pgTable("roulette_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: rouletteSessionStatusEnum("status").notNull().default("draft"),
  removeWinnerAfterDraw: boolean("remove_winner_after_draw")
    .notNull()
    .default(true),
  predeterminedWinnerId: uuid("predetermined_winner_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rouletteParticipants = pgTable("roulette_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => rouletteSessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderNo: integer("order_no").notNull(),
  isRemoved: boolean("is_removed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rouletteDrawResults = pgTable("roulette_draw_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => rouletteSessions.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => rouletteParticipants.id, { onDelete: "cascade" }),
  winnerNameSnapshot: text("winner_name_snapshot").notNull(),
  drawMode: rouletteDrawModeEnum("draw_mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});