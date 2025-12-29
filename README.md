# Money Mastery System - Website Project

## Project Goals & Aesthetic
- Present the Money Mastery System for women entrepreneurs with a "Modern Luxury Minimalism" tone.
- Deliver a supportive, non-judgmental narrative through warm beige and cream palettes, serif headlines, and clear typography.
- Educate visitors about the product story, pricing tiers, and the Clarity AI assistant in an inviting, scrollable experience.

## Completed Features
- **Home Page (`index.html`)** with hero messaging, pain point grid, solution journey, feature showcases, testimonials, founder section, and an interactive multi-step quiz.
- **Pricing Page (`pricing.html`)** featuring a three-tier pricing grid, competitor comparison table, feature explorer modal, and FAQ accordion.
- **Scroll-triggered animation system** powered by IntersectionObserver for `.fade-in-up` and `.reveal-on-scroll` elements, with respectful motion (30px lift, eased opacity), auto-stagger utilities, and full graceful-degradation when JavaScript is disabled or reduced motion is preferred.
- **Sticky Clarity chat bubble and mock conversational assistant** providing knowledge-base style responses while the real API connection remains gated.
- **Tailwind CSS via CDN** with custom brand token setup, Google Fonts (Playfair Display & Montserrat), and Font Awesome icons for visual consistency.
- **Responsive layout and interactive affordances** including refined hover states, shimmering CTAs, and custom scrollbars to maintain the luxe brand feel.
- **Secure Gemini proxy integration** using a Cloudflare Worker (`worker/clarity-worker.js`) that keeps API keys server-side, supports lightweight conversation memory, and can hydrate responses with the living document context.

## Entry Points & Navigation
- `/index.html` – Primary landing experience with anchored navigation (`#how-it-works`, `#about`, `#quiz`) and in-page storytelling.
- `/pricing.html` – Dedicated plan breakdown with quick return links back to the landing content (e.g., `index.html#how-it-works`).
- Both documents load shared assets: `css/style.css`, `js/main.js`, `js/quiz.js`, and optional calculators.

## Secure Gemini Setup
1. **Prepare environment secrets** (never commit API tokens):
   ```bash
   # Set inside the Cloudflare project using wrangler
   wrangler secret put GEMINI_API_KEY
   wrangler secret put LIVING_DOC_URL    # e.g. https://docs.google.com/document/d/<ID>/export?format=txt
   wrangler secret put SYSTEM_PROMPT     # optional override of the default prompt
   wrangler secret put ALLOWED_ORIGIN    # optional, defaults to incoming Origin
   wrangler secret put GEMINI_MODEL      # optional, defaults to gemini-1.5-flash
   ```
   For local development, create a `.dev.vars` file with the same keys. The worker reads these values via `env` bindings.
2. **Deploy the Cloudflare Worker** defined in `wrangler.jsonc`:
   ```bash
   wrangler deploy
   ```
   The worker caches the living document (up to 6k characters) and forwards user questions to Gemini while keeping your key private.
3. **Point the frontend at the proxy endpoint:**
   - If the worker is mounted on the same domain at `/api/clarity`, no further changes are required.
   - Otherwise, set a global override before loading `js/main.js`:
     ```html
     <script>
       window.CLARITY_API_ENDPOINT = 'https://your-worker.workers.dev/api/clarity';
     </script>
     ```
4. **Rotate the exposed API key** in Google Cloud Console, then update the secret above. The original key was visible in prior work and should be considered compromised.

> The frontend sends the last 20 exchanges as context on each request; increase or decrease this limit in `js/main.js` if needed.

## Features Not Yet Implemented
- **Endpoint authentication & abuse protection.** The new proxy currently trusts any caller; add auth, bot mitigation, or rate limiting before launch.
- **Real chat persistence or analytics.** Conversations reset on refresh and no data is stored server-side.
- **Dynamic pricing data source.** Plan content is static; no Table API or CMS is wired in yet.
- **Media enhancements.** Demo video overlays currently use static imagery placeholders.

## Recommended Next Steps
1. Stand up a secure backend (serverless function, edge worker, or trusted proxy) to handle Gemini requests without exposing API keys. Update `js/main.js` to call that endpoint instead of the direct Google URL.
2. Replace placeholder media with hosted video content or interactive demos once available.
3. Evaluate performance optimizations (image compression, preloading critical fonts) before launch.
4. Consider integrating the Table API for collecting quiz results or lead captures if persistence becomes necessary.
5. Add automated tests or linting for long-term maintainability.

## Public URLs & Deployment
- No production URL is configured through this workspace yet.
- **To publish**, use the platform's **Publish** tab. It will generate and share the live deployment URL automatically.

## Data Models & Storage
- No external databases or Table API schemas are currently in use.
- Chat responses rely on a client-side knowledge base (`getMockResponse`) until a secure AI integration is provided.

## Animation & Interaction Notes
- Scroll animations activate once per element by default. To allow repeat animations, set `data-animate-once="false"` on the target element.
- Custom delays can be specified with data attributes (e.g., `data-animate-delay="0.35s"`) or Tailwind-style utility classes (`delay-100`, `delay-200`, `delay-300`).
- Users with `prefers-reduced-motion: reduce` receive an immediate, no-animation experience.

## Accessibility & UX Considerations
- Semantic markup, alt text for imagery, and high-contrast color selections support usability.
- Smooth scrolling and responsive spacing ensure comfortable navigation for both desktop and mobile visitors.
