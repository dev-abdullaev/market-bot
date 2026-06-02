# Deployment Runbook — Market Bot (Free-tier: Netlify + Render + Neon)

Stack: Telegram WebApp → Netlify (frontend) → /api proxy → Render (backend, free) → Neon (Postgres, free).
The bot runs locally, polls Telegram, and calls the public Render backend.

---

## Step 1 — Neon (managed Postgres, free tier)

1. Go to https://neon.tech and sign in (GitHub login, no card required).
2. Create a new project. Pick a region close to your Render deployment (e.g. US East).
3. In the project dashboard open **Connection Details**, select **Pooled connection**, and copy the connection string. It looks like:

   ```
   postgres://user:password@ep-xxx-yyy.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Save this value — you will paste it into Render as `DATABASE_URL`.

Free-tier note: Neon free tier is always-on (no cold starts). Storage limit is 0.5 GB, which is plenty for early usage.

---

## Step 2 — Render (backend, free web service)

### 2a. Deploy via render.yaml Blueprint (recommended)

1. Fork or push this repo to GitHub/GitLab.
2. Go to https://dashboard.render.com → **New** → **Blueprint**.
3. Connect your repo. Render auto-detects `render.yaml` at the root.
4. In the blueprint setup screen, fill in the secrets marked `sync: false`:
   - `SECRET_KEY` — generate one: `python -c "import secrets; print(secrets.token_hex(50))"`
   - `DATABASE_URL` — paste the Neon pooled URL from Step 1
   - `TELEGRAM_BOT_TOKEN` — your bot token from @BotFather
   - `BOT_SHARED_SECRET` — any random secret string shared with the bot (e.g. `openssl rand -hex 24`)
5. Leave `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` with placeholder values for now; you will update them after Step 3.
6. Click **Apply**. Render builds the Docker image from `backend/Dockerfile`, the entrypoint runs `migrate → collectstatic → gunicorn`.
7. Once green, note your backend URL: `https://market-bot-backend.onrender.com` (exact subdomain shown in dashboard).

### 2b. Alternative — manual web service (skip Blueprint)

New → Web Service → connect repo → set:
- Environment: Docker
- Dockerfile path: `./backend/Dockerfile`
- Docker context: `./backend`
- Plan: Free
- Health check path: `/api/auth/me`
- All env vars from the table above.

### 2c. Create the first operator (superuser or operator+store)

Once the service is running, open a shell:

```
# In the Render dashboard → Shell tab, or via Render CLI:
render ssh market-bot-backend
```

Then:

```bash
python manage.py createsuperuser
# Or, to create an operator user + store in one go:
python manage.py shell -c "
from apps.accounts.models import User
from apps.stores.models import Store
u = User.objects.create_superuser('operator', 'op@example.com', 'CHANGE_ME')
s = Store.objects.create(name='My Store', owner=u)
print('Done. Store id:', s.id)
"
```

Free-tier note: Render free web services spin down after 15 minutes of inactivity and cold-start in ~50 seconds on the next request. This is fine for a Telegram WebApp (user triggers the first request, sees a brief spinner). Upgrade to Starter ($7/month) to eliminate cold starts if needed.

---

## Step 3 — Netlify (frontend)

### 3a. Edit the API proxy placeholder

Open `frontend/netlify.toml` and replace `REPLACE-WITH-RENDER-BACKEND` with your actual Render subdomain:

```toml
[[redirects]]
  from   = "/api/*"
  to     = "https://market-bot-backend.onrender.com/api/:splat"
  status = 200
  force  = true
```

Commit and push.

### 3b. Deploy to Netlify

**Option A — Git-connected deploy (recommended for CI):**
1. Go to https://app.netlify.com → **Add new site** → **Import an existing project**.
2. Connect GitHub/GitLab, select this repo.
3. Set build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
4. No env vars needed for the frontend (API calls go through the `/api` proxy).
5. Deploy. Note your Netlify URL: `https://market-bot.netlify.app`.

**Option B — CLI one-shot:**
```bash
cd frontend
npm install -g netlify-cli
netlify login
netlify deploy --build --prod
```

### 3c. Update Render with the Netlify domain

Go back to the Render dashboard → market-bot-backend → Environment, and set:

```
CORS_ALLOWED_ORIGINS=https://market-bot.netlify.app
CSRF_TRUSTED_ORIGINS=https://market-bot.netlify.app,https://market-bot-backend.onrender.com
```

Also update `render.yaml` in the repo (for future redeployments). Trigger a redeploy (or it auto-deploys on push).

Note: Because Netlify proxies `/api/*` to Render, the browser sees requests as same-origin. CORS headers on Render are not strictly required for the WebApp, but setting them is good practice for direct API clients (e.g. bot, admin tools).

---

## Step 4 — Bot (local, pointing at public backend)

The bot runs locally via docker compose. Update your root `.env` (never commit it):

```dotenv
TELEGRAM_BOT_TOKEN=<your token>
BOT_SHARED_SECRET=<same value set on Render>
FRONTEND_WEBAPP_URL=https://market-bot.netlify.app

# For the bot container to reach the public backend:
BACKEND_API_URL=https://market-bot-backend.onrender.com/api
```

Then start only the bot container (DB and backend are on the cloud now):

```bash
docker compose up -d --build bot
```

The compose file passes `BACKEND_API_URL` to the bot service. Verify logs:

```bash
docker compose logs -f bot
```

You should see the bot connecting to Telegram and calling the Render backend.

---

## Step 5 — Telegram BotFather setup

1. Open Telegram → @BotFather → `/mybots` → select your bot.
2. **Menu Button / Web App** (optional but recommended for Telegram Mini App):
   - `/setmenubutton` → pick your bot → enter the Netlify URL.
3. Test: send `/start` to the bot. The WebApp button should open `https://market-bot.netlify.app`.
4. Verify the app loads, logs in via JWT, and all API calls return data.

---

## Free-tier summary

| Service | Free limits | Notes |
|---|---|---|
| Neon | 0.5 GB storage, always-on | No cold starts |
| Render | 750 h/month compute, sleeps after 15 min idle | ~50 s cold start |
| Netlify | 100 GB bandwidth, 300 build min/month | No cold starts |

## Security reminders

- The bot token in your local `.env` should be kept out of git (`.gitignore` covers `.env`).
- If the token was ever committed, revoke it at @BotFather (`/revoke`) and generate a new one, then update Render env.
- `SECRET_KEY` on Render must be different from the dev fallback `dev-insecure-key`.
- `BOT_SHARED_SECRET` must match exactly between Render and the local bot container.
- Never set `DEBUG=1` on Render; the blueprint already sets `DEBUG=0`.
