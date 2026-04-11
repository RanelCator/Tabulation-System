import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function loginWithPasscode(passcode: string) {
  const activeUsers = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true));

  for (const user of activeUsers) {
    const isMatch = await bcrypt.compare(passcode, user.passcodeHash);

    if (isMatch) {
      return user;
    }
  }

  return null;
}