# Deploying the invitation

The project is deployed in two parts:

| Part | What | Where | Address |
|---|---|---|---|
| **Site** | the static invitation (`dist/client` after a build) | GitHub Pages | `https://maryamandmahmoud.com` |
| **API** | `api/send-mail.php` + `.env` (SMTP) | Hostinger | `https://<api-host>/send-mail.php` |

The site calls the API to email each RSVP and wish. Deploy the **API first**: its https URL is built into the site.

> The API must be on **https**. Browsers block an https page (GitHub Pages) from calling a plain `http://` or bare-IP address, so give the API a (sub)domain with a certificate.

---

## Part 1 — the API

Upload **`api/send-mail.php`** and **`api/.htaccess`**, plus your **`.env`**, so that `.env` sits **one folder above** `send-mail.php`:

```
<some folder>/
├── .env                 ← SMTP settings + ALLOWED_ORIGINS (private)
└── <web folder>/
    ├── send-mail.php
    └── .htaccess
```

`send-mail.php` reads `../.env`. Keep `.env` out of any web-served folder. The `.htaccess` blocks dot-files anyway, as a safety net.

**`.env` on the server needs:**

```dotenv
SMTP_HOST=…            SMTP_PORT=587    SMTP_SECURE=false
SMTP_USER=…            SMTP_PASS=…
SMTP_FROM="Mahmoud & Maryam Wedding <you@yourdomain.com>"
SMTP_TO="where-rsvps-go@gmail.com"
ALLOWED_ORIGINS=https://maryamandmahmoud.com,https://www.maryamandmahmoud.com
```

`ALLOWED_ORIGINS` lists the sites allowed to call the API from a browser. Calls from anywhere else are refused (403). `localhost` is always allowed, for development.

### On Hostinger
Put `send-mail.php` + `.htaccess` in `public_html` (or a subdomain's folder), and `.env` in the folder **above** it (`domains/<domain>/`). The API URL is then `https://<that domain>/send-mail.php`.

### Check the API
```bash
curl -s -X POST https://<api-host>/send-mail.php \
  -H "Origin: https://maryamandmahmoud.com" -H "Content-Type: application/json" \
  -d '{"type":"rsvp","name":"","elapsed":"5000"}'
```
Expect `{"ok":false,"error":"invalid"}`. That's correct: PHP ran and rejected the empty name. If you get the PHP source code, or a 404 or 500, see Troubleshooting.

---

## Part 2 — the site on GitHub Pages

1. Build. The API's URL comes from `.env.production` (public, not a secret: `https://api.maryamandmahmoud.com/send-mail.php`):
   ```bash
   npm run build
   ```
   The site is now in **`dist/client`**: `index.html`, `assets/`, `wedding-song.mp3`, `CNAME`, and no PHP.
2. Publish the **contents of `dist/client`** to your Pages repo or branch, e.g. a `gh-pages` branch:
   ```bash
   cd dist/client
   git init -b gh-pages && git add -A && git commit -m "Deploy"
   git push -f git@github.com:<user>/<repo>.git gh-pages
   ```
   Then in the repo's **Settings → Pages**, set Source = *Deploy from a branch*, Branch = `gh-pages` / root.
3. **Custom domain:** `CNAME` (from `public/CNAME`) already says `maryamandmahmoud.com`. In the domain's DNS:

   | Type  | Name  | Value |
   |-------|-------|-------|
   | A     | `@`   | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (4 records) |
   | CNAME | `www` | `<user>.github.io` |

   Then tick **Enforce HTTPS** in Settings → Pages once GitHub has issued the certificate.

### Updating
- **Site text, design, song:** `npm run build` and publish `dist/client` again.
- **SMTP or allowed sites:** edit `.env` on the server. No rebuild needed.
- **API URL changed:** update `.env.production`, rebuild, publish.

---

## Before sending the invitations
`.env` currently uses the **Mailtrap sandbox**, which keeps every email inside Mailtrap. Switch to a real sender, e.g. a Hostinger mailbox:

```dotenv
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=rsvp@maryamandmahmoud.com
SMTP_PASS=<mailbox password>
SMTP_FROM="Mahmoud & Maryam Wedding <rsvp@maryamandmahmoud.com>"
```

`SMTP_FROM` must be the mailbox you log in with.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| RSVP shows "تعذّر الإرسال" and the browser console mentions **CORS** | The site's address isn't in `ALLOWED_ORIGINS` (check exact `https://`, with or without `www`) |
| Console shows **Mixed Content** | `VITE_MAIL_ENDPOINT` is `http://` or a bare IP. Use the https hostname and rebuild |
| The API URL shows PHP source code | That host isn't running PHP for this folder |
| `{"ok":false,"error":"config"}` | `.env` not found one folder above `send-mail.php`, or a value is missing or invalid. The PHP error log has a `send-mail:` line saying which |
| `{"ok":false,"error":"send"}` | SMTP login, port or address problem. See the `send-mail:` line in the PHP error log. If 587 is blocked, try 465 with `SMTP_SECURE=true` |
| Site loads but looks old | Pages can take a minute to update. Hard-refresh |
