import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { JWT_SECRET, DAILY_LIMIT, OWNER_USERNAME, requireAuth, getTodayDate, type AuthPayload } from "../middlewares/auth";

const router: IRouter = Router();

function buildUserInfo(user: typeof usersTable.$inferSelect) {
  const today = getTodayDate();
  const questionsToday = user.lastResetDate === today ? user.questionsToday : 0;
  const isOwner = user.role === "owner";
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    questionsToday,
    questionsLimit: isOwner ? -1 : DAILY_LIMIT,
  };
}

// POST /auth/check-username
router.post("/check-username", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    const clean = username.toLowerCase().trim();
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, clean)).limit(1);
    res.json({ available: existing.length === 0 });
  } catch (err) {
    req.log.error({ err }, "check-username error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const clean = username.toLowerCase().trim();

    if (clean.length < 3 || clean.length > 30) {
      res.status(400).json({ error: "Username must be between 3 and 30 characters" });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      res.status(400).json({ error: "Username can only contain lowercase letters, numbers, and underscores" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.username, clean)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role = clean === OWNER_USERNAME ? "owner" : "user";
    const today = getTodayDate();

    const [user] = await db.insert(usersTable).values({
      username: clean,
      passwordHash,
      role,
      questionsToday: 0,
      lastResetDate: today,
    }).returning();

    const payload: AuthPayload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({ token, user: buildUserInfo(user) });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const clean = username.toLowerCase().trim();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, clean)).limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const payload: AuthPayload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: buildUserInfo(user) });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, req.user!.username)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(buildUserInfo(user));
  } catch (err) {
    req.log.error({ err }, "me error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
