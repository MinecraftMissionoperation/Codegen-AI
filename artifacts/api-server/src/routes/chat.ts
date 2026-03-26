import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, DAILY_LIMIT, getTodayDate } from "../middlewares/auth";
const router: IRouter = Router();

router.post("/message", requireAuth, async (req, res) => {
  try {
    const { message, history: rawHistory } = req.body as { message: unknown; history: unknown };

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Invalid request body: message is required" });
      return;
    }

    const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(rawHistory)
      ? rawHistory.filter((m: any) => m && typeof m.role === "string" && typeof m.content === "string")
      : [];
    const { username } = req.user!;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const isOwner = user.role === "owner";
    const today = getTodayDate();

    let questionsToday = user.questionsToday;
    if (user.lastResetDate !== today) {
      questionsToday = 0;
      await db.update(usersTable).set({ questionsToday: 0, lastResetDate: today }).where(eq(usersTable.id, user.id));
    }

    if (!isOwner && questionsToday >= DAILY_LIMIT) {
      res.status(429).json({
        error: "You've used all 10 of your daily questions. Come back tomorrow!",
        questionsToday,
        questionsLimit: DAILY_LIMIT,
      });
      return;
    }

    await db.update(usersTable)
      .set({ questionsToday: questionsToday + 1, lastResetDate: today })
      .where(eq(usersTable.id, user.id));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const model = isOwner ? "gpt-5.2" : "gpt-5.1";

    const systemPrompt = `You are a helpful, knowledgeable AI assistant. You can answer questions about any topic — math, science, weather, general knowledge, creative writing, analysis, and more. Be concise but thorough. Format your responses clearly using markdown when helpful.`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ];

    const stream = await openai.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const newQuestionsToday = questionsToday + 1;
    res.write(`data: ${JSON.stringify({ done: true, questionsToday: newQuestionsToday, questionsLimit: isOwner ? -1 : DAILY_LIMIT })}\n\n`);
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
