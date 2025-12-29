const DEFAULT_PROMPT = `You are Clarity, an AI financial guide for the "Money Mastery System" (created by Donna Roggio).
Your tone is warm, non-judgmental, encouraging, and clear. Avoid unexplained jargon, reference platform features,
and always invite follow-up questions tailored to women entrepreneurs.

KEY SYSTEM FEATURES:
1. Dashboard surfaces "Safe to Spend" number in addition to balances.
2. Transactions tab syncs via Stripe and requires manual or AI-assisted labeling.
3. Debt payoff planner supports both Snowball (lowest balance) and Avalanche (highest interest) strategies.
4. Net worth tracker differentiates assets and liabilities to show overall wealth shifts.
5. Profit First methodology helps founders allocate profit before expenses.

COMMON ANSWERS & POLICIES:
- Annual cost: $888/year (roughly $2.43/day) with no refunds on the base product.
- Security: Uses Stripe + 256-bit SSL and never stores bank credentials.
- Time commitment: 60–90 minute onboarding, then 15 minutes per week of upkeep.

If specific account data is required say: "I'd love to help with that! Once you're logged in, I can see your specific data to give you a better answer."`; // eslint-disable-line max-len

const MAX_DOCUMENT_CHARS = 6000;
const CORS_MAX_AGE = 86400; // 24 hours

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": String(CORS_MAX_AGE)
});

const mapHistoryToContents = (history = []) => {
  return history
    .filter((entry) => entry && entry.role && entry.content)
    .map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }]
    }));
};

const buildCacheKey = (url) => new Request(url, { method: "GET" });

const sanitizeDocumentText = (text) => {
  if (!text) return "";
  return text
    .replace(/\u00a0/g, " ") // non-breaking spaces
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DOCUMENT_CHARS);
};

const fetchLivingDocument = async (env) => {
  if (!env.LIVING_DOC_URL) return null;
  try {
    const cache = caches.default;
    const cacheKey = buildCacheKey(env.LIVING_DOC_URL);
    const cached = await cache.match(cacheKey);

    if (cached) {
      return sanitizeDocumentText(await cached.text());
    }

    const response = await fetch(env.LIVING_DOC_URL, {
      headers: { "Cache-Control": "no-cache" }
    });

    if (!response.ok) {
      console.warn("Failed to load living document", response.status);
      return null;
    }

    const text = sanitizeDocumentText(await response.text());
    await cache.put(
      cacheKey,
      new Response(text, {
        headers: { "Cache-Control": "public, max-age=604800" } // 7 days
      })
    );

    return text;
  } catch (error) {
    console.warn("Error retrieving living document", error);
    return null;
  }
};

const buildGeminiPayload = (prompt, docText, history, generationConfig) => {
  const contents = mapHistoryToContents(history);
  const promptParts = [{ text: prompt }];

  if (docText) {
    promptParts.push({ text: `Reference Document (excerpt):\n${docText}` });
  }

  return {
    contents: [
      {
        role: "user",
        parts: promptParts
      },
      ...contents
    ],
    generationConfig: generationConfig || {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };
};

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || request.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      ...corsHeaders(origin)
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers
      });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server missing Gemini API key" }), {
        status: 500,
        headers
      });
    }

    try {
      const body = await request.json();
      const { message, history = [], generationConfig } = body || {};

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing user message" }), {
          status: 400,
          headers
        });
      }

      const docText = await fetchLivingDocument(env);
      const prompt = env.SYSTEM_PROMPT ? `${env.SYSTEM_PROMPT}` : DEFAULT_PROMPT;

      const payload = buildGeminiPayload(prompt, docText, history, generationConfig);

      // Ensure latest user message is appended if not already captured in history.
      const lastEntry = history[history.length - 1];
      if (!lastEntry || lastEntry.content !== message) {
        payload.contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      const model = env.GEMINI_MODEL || "gemini-1.5-flash";

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const result = await geminiResponse.json();

      if (!geminiResponse.ok) {
        console.error("Gemini API error", result);
        return new Response(JSON.stringify({ error: "Gemini API request failed" }), {
          status: geminiResponse.status,
          headers
        });
      }

      const reply =
        result?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join("\n") || null;

      if (!reply) {
        return new Response(JSON.stringify({ error: "No response generated" }), {
          status: 502,
          headers
        });
      }

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers
      });
    } catch (error) {
      console.error("Unhandled worker error", error);
      return new Response(JSON.stringify({ error: "Unexpected server error" }), {
        status: 500,
        headers
      });
    }
  }
};
