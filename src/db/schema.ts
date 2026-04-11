import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "judge"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "open", "closed"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: userRoleEnum("role").notNull(),
  displayName: text("display_name").notNull(),
  passcodeHash: text("passcode_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  status: eventStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const criteria = pgTable("criteria", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  maxScore: numeric("max_score", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const judgeAssignments = pgTable(
  "judge_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    judgeUserId: uuid("judge_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => ({
    judgeEventUnique: unique().on(table.judgeUserId, table.eventId),
  }),
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    judgeUserId: uuid("judge_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => criteria.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    oneScorePerCriterion: unique().on(
      table.judgeUserId,
      table.participantId,
      table.criterionId,
    ),
  }),
);

export const deductions = pgTable(
  "deductions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    points: numeric("points", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"),
  },
  (table) => ({
    oneDeductionPerParticipantPerEvent: unique().on(table.eventId, table.participantId),
  }),
);