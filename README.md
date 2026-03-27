# Dual-Mode AI Assistant (LLM + Coding)

This app is an AI assistant with **two modes**:

- **LLM Mode**: for general natural-language tasks (chat, Q&A, summarization, writing, planning).
- **Coding Mode**: for software-development tasks (code generation, debugging, refactoring, tests, explanations).

The goal is to make responses more reliable by using a mode that matches the user’s intent.

---

## Modes

### 1) LLM Mode
Use this mode when you want:
- explanations in plain English
- brainstorming and idea generation
- rewriting, summarizing, and drafting documents
- general questions not tied to writing code

**Output style:** conversational, minimal code unless requested.

### 2) Coding Mode
Use this mode when you want:
- code written or modified (functions, scripts, classes, APIs)
- debugging help (errors, stack traces, broken logic)
- refactoring for readability/performance
- unit tests and documentation for code
- step-by-step technical guidance

**Output style:** code-first and structured, with assumptions and edge cases when relevant.

---

## Switching Modes

The assistant can be set to a specific mode in one of these ways (depending on how you integrated it):

- **Manual selection:** choose `llm` or `coding` before sending a prompt.
- **Per-request:** include the mode with the message (e.g., a dropdown, flag, or API field).
- **Auto-routing (optional):** the app can detect intent and select a mode automatically (e.g., code blocks, stack traces, “write a function”, etc.).

---

## Typical Examples

### LLM Mode examples
- “Summarize this article in 5 bullets…”
- “Rewrite this email to sound more professional…”
- “Explain how databases indexing works…”

### Coding Mode examples
- “Write a Python function that validates a JSON schema…”
- “Here’s an error trace—what’s causing it and how do I fix it?”
- “Refactor this code to be cleaner and add unit tests…”

---

## Notes / Limitations
- Outputs may be incorrect—verify important details and review code before running.
- Don’t paste secrets (API keys, credentials) into prompts.
- For production use, consider adding linting, testing, and security checks to your workflow.
