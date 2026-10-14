# Site chat assistant (gpt-oss-120b)

An AI chat widget for your website that answers from your own database.

- `widget/`      the chat bubble (static files, hosted free on **GitHub Pages**)
- `api/chat.js`  the backend that talks to the model (deployed on **Vercel**, free tier)
- `lib/db.js`    the one file you edit to connect **your database**

The model is **OpenAI gpt-oss-120b**, called through an OpenAI-compatible API
(OpenRouter by default; Groq and others work by changing `LLM_BASE_URL`).

## Where your API key goes

| Where | How |
|---|---|
| Local testing | Copy `.env.example` to `.env` and paste your key after `LLM_API_KEY=` |
| Live site | Vercel -> Project -> Settings -> Environment Variables -> add `LLM_API_KEY` |

Do **not** paste the key into `chat-widget.js`, `index.html` or any file in `widget/`:
those files are public. `.env` is listed in `.gitignore`, so it is not uploaded to GitHub.

Get a key at openrouter.ai/keys (or console.groq.com/keys if you use Groq).

## Setup

1. **Push to GitHub.** Create a repo and push this folder to `main` (`.env` stays local).
2. **Deploy the API on Vercel.** Import the repo at vercel.com/new, add these environment variables, then deploy:
   `LLM_API_KEY`, `LLM_MODEL` (`openai/gpt-oss-120b`), `LLM_BASE_URL`, `ALLOWED_ORIGINS`.
   Your API is then at `https://YOUR-APP.vercel.app/api/chat`.
3. **Host the widget.** Repo -> Settings -> Pages -> Source: **GitHub Actions**.
   Pushing to `main` publishes `widget/` to `https://YOURNAME.github.io/REPO/`.
4. **Add it to your website** (paste before `</body>`):
   ```html
   <script src="https://YOURNAME.github.io/REPO/chat-widget.js"
           data-api="https://YOUR-APP.vercel.app/api/chat"
           data-title="Ask us anything"
           data-color="#1f5f4a"
           data-greeting="Hi! What can I help you find?" defer></script>
   ```
5. **Connect your database.** Edit `searchRecords()` in `lib/db.js`. It gets the visitor's keywords and returns up to 5 short records. Supabase and Postgres examples are included. Use a read-only database user and only expose data visitors may see.

## Test locally
```bash
npm i -g vercel
cp .env.example .env      # paste your key, set ALLOWED_ORIGINS=*
vercel dev                # API on http://localhost:3000/api/chat
npx serve widget          # open the demo page
```

## Before going live
- Set `ALLOWED_ORIGINS` to your real domains (not `*`).
- Add rate limiting (Vercel Firewall or Upstash Ratelimit) and set a spend limit with your provider.
- If your key is ever exposed, revoke it at the provider and create a new one.
