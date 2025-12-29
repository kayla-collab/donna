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

const buildLlamaMessages = (systemPrompt, docText, history, userMessage) => {
  const messages = [];

  // System message with context
  let fullSystemPrompt = systemPrompt;
  if (docText) {
    fullSystemPrompt += `\n\nReference Document (excerpt):\n${docText}`;
  }
  messages.push({ role: 'system', content: fullSystemPrompt });

  // History - Assuming history comes in as { role: 'user'|'model'|'assistant', content: 'text' }
  if (Array.isArray(history)) {
    history.forEach(entry => {
      if (entry.role && entry.content) {
        let role = entry.role;
        // Map 'model' to 'assistant' for Llama compatibility
        if (role === 'model') role = 'assistant';
        
        messages.push({
          role: role,
          content: entry.content
        });
      }
    });
  }

  // Current user message (if not already in history)
  const lastEntry = messages[messages.length - 1];
  if (!lastEntry || lastEntry.role !== 'user' || lastEntry.content !== userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  return messages;
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
    
    const url = new URL(request.url);

    // --- Image Function Integration ---
    if (url.pathname === '/image' || url.pathname === '/process-image') {
       if (request.method !== "POST") {
         return new Response(JSON.stringify({ error: "Method not allowed for image endpoint" }), {
            status: 405, headers 
         });
       }

       if (!env["image-function"]) {
         return new Response(JSON.stringify({ error: "Image function binding not configured" }), {
            status: 500, headers
         });
       }

       try {
         // The user's snippet suggests using request body as the image stream
         // and chaining .input().output().response()
         // Note: .draw() is omitted as its parameters are unknown, but the structure is preserved
         const imageResponse = await env["image-function"]
            .input(request.body)
            // .draw(...) // Placeholder for draw operations if needed
            .output({ format: "image/avif" })
            .response();
         
         return imageResponse;
       } catch (e) {
         console.error("Image processing error:", e);
         return new Response(JSON.stringify({ error: "Image processing failed", details: e.message }), {
            status: 500, headers
         });
       }
    }
    // ----------------------------------

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers
      });
    }

    // Workers AI uses the AI binding, so no specific API key check needed here
    // unless you want to protect your own endpoint with a custom token.
    if (!env.AI) {
      return new Response(JSON.stringify({ error: "Server missing AI binding" }), {
        status: 500,
        headers
      });
    }

    try {
      const body = await request.json();
      const { message, history = [] } = body || {};

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing user message" }), {
          status: 400,
          headers
        });
      }

      const docText = await fetchLivingDocument(env);
      const prompt = env.SYSTEM_PROMPT ? `${env.SYSTEM_PROMPT}` : DEFAULT_PROMPT;

      const messages = buildLlamaMessages(prompt, docText, history, message);

      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: messages
      });

      // Workers AI result typically { response: "text" }
      const reply = response.response;

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
      return new Response(JSON.stringify({ error: "Unexpected server error", details: error.message }), {
        status: 500,
        headers
      });
    }
  }
};
