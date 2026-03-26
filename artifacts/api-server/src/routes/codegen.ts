import { Router, type IRouter } from "express";
import { GenerateCodeBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, DAILY_LIMIT, OWNER_USERNAME, getTodayDate } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const body = GenerateCodeBody.parse(req.body);
    const { prompt, language } = body;
    const { username } = req.user!;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const isOwner = user.role === "owner";
    const today = getTodayDate();

    // Reset daily count if it's a new day
    let questionsToday = user.questionsToday;
    if (user.lastResetDate !== today) {
      questionsToday = 0;
      await db.update(usersTable).set({ questionsToday: 0, lastResetDate: today }).where(eq(usersTable.id, user.id));
    }

    // Enforce daily limit for non-owners
    if (!isOwner && questionsToday >= DAILY_LIMIT) {
      res.status(429).json({
        error: "You've used all 5 of your daily questions. Come back tomorrow!",
        questionsToday,
        questionsLimit: DAILY_LIMIT,
      });
      return;
    }

    // Increment count before streaming so it's always tracked
    await db.update(usersTable)
      .set({ questionsToday: questionsToday + 1, lastResetDate: today })
      .where(eq(usersTable.id, user.id));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Owners get the best model, normal users get a capable model
    const model = isOwner ? "gpt-5.2" : "gpt-5.1";
    const languageHint = language ? ` Use ${language}.` : "";
    const systemPrompt = `You are an expert software engineer and coding assistant. When given a description, generate clean, well-structured, working code.${languageHint} Output only the code, no explanations unless the user asks. Use proper formatting and comments where helpful.`;

    const stream = await openai.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send updated question count to the client
    const newQuestionsToday = questionsToday + 1;
    res.write(`data: ${JSON.stringify({ done: true, questionsToday: newQuestionsToday, questionsLimit: isOwner ? -1 : DAILY_LIMIT })}\n\n`);
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Code generation error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Code generation failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
