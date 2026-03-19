# SecretShare — Deploy Guide

Encrypted, burn-after-reading secret sharing. AES-256-GCM, end-to-end encrypted.
Your free URL will be: `https://your-project-name.vercel.app`

---

## Step 1 — Install dependencies

```bash
cd secretshare
npm install
```

---

## Step 2 — Push to GitHub

1. Go to https://github.com/new and create a new repository (call it `secretshare`)
2. Run these commands:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/secretshare.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com and log in
2. Click **"Add New Project"**
3. Import your `secretshare` GitHub repo
4. Click **Deploy** — Vercel auto-detects Next.js

Your app is now live at `https://secretshare-xxx.vercel.app`

---

## Step 4 — Add Vercel KV (the database for secrets)

Vercel KV stores encrypted secrets serverside so links work across any device.

1. In your Vercel dashboard, go to your project → **Storage** tab
2. Click **"Create Database"** → choose **KV (Redis)**
3. Name it `secretshare-kv` → click **Create & Continue**
4. Click **"Connect to Project"** and select your `secretshare` project
5. Click **Continue** — this auto-adds the env variables (`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`)

6. Back in Vercel, go to **Deployments** → click **"Redeploy"**

That's it! Your app is fully live.

---

## Step 5 — Test it

1. Visit `https://your-project.vercel.app`
2. Type a secret, set a passphrase, click **Encrypt & generate link**
3. Copy the link — send it to someone
4. Send the passphrase **separately** (different app/message)
5. Recipient opens the link, enters passphrase → reads the secret

If burn-after-reading is on, the secret is gone after step 5.

---

## Local development (optional)

To run locally, create a `.env.local` file with your KV credentials from Vercel dashboard:

```
KV_REST_API_URL=your_url_here
KV_REST_API_TOKEN=your_token_here
```

Then:
```bash
npm run dev
```

Open http://localhost:3000

---

## Security notes

- Secrets are encrypted in the browser with AES-256-GCM before being sent to the server
- The passphrase never leaves your device
- The server only stores ciphertext — it cannot read your secrets
- Secrets auto-expire after 7 days even without burn-after-reading
