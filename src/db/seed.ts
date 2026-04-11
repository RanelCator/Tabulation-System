import "dotenv/config";
import { db } from "./index";
import {
  users,
  events,
  participants,
  criteria,
  judgeAssignments,
} from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding...");

  // --- PASSCODES (CHANGE THESE LATER)
  const adminPass = "ADMIN123";
  const judgePass = "JUDGE123";

  const adminHash = await bcrypt.hash(adminPass, 10);
  const judgeHash = await bcrypt.hash(judgePass, 10);

  // --- CREATE ADMIN
  const [admin] = await db
    .insert(users)
    .values({
      role: "admin",
      displayName: "Administrator",
      passcodeHash: adminHash,
    })
    .returning();

  // --- CREATE JUDGE
  const [judge] = await db
    .insert(users)
    .values({
      role: "judge",
      displayName: "Judge 1",
      passcodeHash: judgeHash,
    })
    .returning();

  // --- CREATE EVENT
  const [event] = await db
    .insert(events)
    .values({
      name: "Sample Event",
      status: "open",
    })
    .returning();

  // --- ASSIGN JUDGE TO EVENT
  await db.insert(judgeAssignments).values({
    judgeUserId: judge.id,
    eventId: event.id,
  });

  // --- CREATE PARTICIPANTS
  const createdParticipants = await db
    .insert(participants)
    .values([
      { eventId: event.id, number: 1, name: "Contestant 1" },
      { eventId: event.id, number: 2, name: "Contestant 2" },
      { eventId: event.id, number: 3, name: "Contestant 3" },
    ])
    .returning();

  // --- CREATE CRITERIA
  await db.insert(criteria).values([
    { eventId: event.id, name: "Talent", maxScore: "40", sortOrder: 1 },
    { eventId: event.id, name: "Beauty", maxScore: "30", sortOrder: 2 },
    { eventId: event.id, name: "Intelligence", maxScore: "30", sortOrder: 3 },
  ]);

  console.log("✅ Seed complete");
  console.log("Admin passcode:", adminPass);
  console.log("Judge passcode:", judgePass);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});