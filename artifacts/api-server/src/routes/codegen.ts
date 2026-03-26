import { Router, type IRouter } from "express";
import { GenerateCodeBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/generate", async (req, res) => {
  try {
    const body = GenerateCodeBody.parse(req.body);
    const { prompt, language } = body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const languageHint = language ? ` Use ${language}.` : "";
    const systemPrompt = `You are an expert software engineer and coding assistant. When given a description, generate clean, well-structured, working code.${languageHint} Output only the code, no explanations unless the user asks for them. Use proper formatting and comments where helpful.`;

    const stream = await openai.chat.completions.create({
      model: "gpt-5.3-codex",
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

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
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
