# How the RSVP and wishes emails work

One copy of `api/send-mail.php` on the server sends email for **any number of invitations**. Each invitation brings its own SMTP server and account (encrypted), and names its own **email template**, a folder in `api/templates/` with its HTML, names, date and colours. The server holds no SMTP settings at all, only a key that unlocks them.

## The idea

```
 ┌─────────────── site project (.env, private) ───────────────┐
 │ SMTP_HOST  SMTP_PORT  SMTP_SECURE                           │
 │ SMTP_USER  SMTP_PASS  SMTP_FROM  SMTP_TO                    │
 │ MAIL_ENCRYPTION_KEY ──┐                                     │
 └───────────────────────┼─────────────────────────────────────┘
                         │  npm run build
                         ▼
        AES-256-GCM encrypt → one token (unreadable text)
                         │
                         ▼
 ┌──────────── public site (dist/client) ────────────┐
 │ contains ONLY the token                            │
 │ (no key, no password, no username, no host)        │
 └──────────────────────┬─────────────────────────────┘
                        │  guest sends an RSVP or wish:
                        │  POST { type, name, …, template, credentials: <token> }
                        ▼
 ┌──── mail server (another host): send-mail.php ────┐
 │ its own .env:  MAIL_ENCRYPTION_KEY  (same fixed key)│
 │        ALLOWED_ORIGINS                              │
 │                                                     │
 │ 1. checks the site is in ALLOWED_ORIGINS            │
 │ 2. decrypts the token with the key                  │
 │ 3. fills templates/<template>/email.html            │
 │ 4. connects to SMTP_HOST:SMTP_PORT, logs in as      │
 │    SMTP_USER, sends from SMTP_FROM to SMTP_TO       │
 └─────────────────────────────────────────────────────┘
```

The encryption runs at **build time**, not in the guest's browser. If the browser did the encrypting, the key would have to be in the public site, and anyone could use it to read the password. This way the key and the password stay in your two private `.env` files.

## Why it's safe to put the token in a public site

- **It can't be read.** Without `MAIL_ENCRYPTION_KEY` the token is just random-looking text.
- **It can't be changed.** AES-GCM is *authenticated*: changing even one character (to send the emails somewhere else, say) makes decryption fail, and the script answers `{"ok":false,"error":"credentials"}`.
- **Nobody can make their own.** Without the key, nobody can create a token that makes your server send mail through *their* SMTP account.
- **The only thing it allows** is what the site already does: send an RSVP or wish to that invitation's `SMTP_TO`. The usual checks still apply to every request: allowed origins, a short delay after the page opens to stop bots, and a limit of 6 messages per 10 minutes per visitor.

Keep `MAIL_ENCRYPTION_KEY` as secret as a password. Anyone who has it can read every token.

## Setting it up

### 1. The key (fixed, made once)

There is **one fixed key**. It's already made: it's `MAIL_ENCRYPTION_KEY` in this project's `.env`, and the identical value is in `api/.env`. The same key goes in every site project and on the mail server. `npm run mail:key` was only for making it the first time. Don't change it on its own: every site built with the old key would stop sending until it's rebuilt.

### 2. The mail server: `send-mail.php` with its own `.env`

`send-mail.php` runs on its own host, separate from the sites. Everything it needs is in the `api/` folder:

```
api/
├── send-mail.php
├── .htaccess        ← keeps .env from being served (Apache / LiteSpeed)
├── .env             ← its own: the fixed key + allowed sites, nothing else
└── templates/       ← one folder per invitation's email (see api/templates/README.md)
    ├── default/
    ├── khaled-shorouk/
    └── mahmoud-maryam/
```

```dotenv
# api/.env
MAIL_ENCRYPTION_KEY=k3J…=          # the fixed key
ALLOWED_ORIGINS=https://khaled-shorouk.com,https://another-wedding.com
```

Upload all of it together. Add each invitation's address to `ALLOWED_ORIGINS`. The script looks for its `.env` beside itself first, then one folder up. Keeping it one folder up (outside the web root) is safest, and on an **nginx** host it's required, because nginx ignores `.htaccess`.

### 3. Each site project's `.env`

```dotenv
# Gmail example: use an App Password (Google Account → Security → App passwords), not your normal password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=khaled.shorouk.rsvp@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM="Khaled & Shorouk <khaled.shorouk.rsvp@gmail.com>"
SMTP_TO=khaled@example.com,shorouk@example.com

MAIL_ENCRYPTION_KEY=k3J…=
VITE_MAIL_ENDPOINT=https://api.example.com/send-mail.php   # usually in .env.production
VITE_MAIL_TEMPLATE=khaled-shorouk                          # its folder in api/templates/
```

| Setting | Meaning |
|---|---|
| `SMTP_HOST` | the mail server, e.g. `smtp.gmail.com`, `smtp.hostinger.com` |
| `SMTP_PORT` | `587` (STARTTLS) or `465` (SSL) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 (optional, default `false`) |
| `SMTP_USER` / `SMTP_PASS` | the mailbox login |
| `SMTP_FROM` | who the emails come from. Use the same mailbox as `SMTP_USER` |
| `SMTP_TO` | where RSVPs and wishes go. Separate several addresses with commas |
| `VITE_MAIL_TEMPLATE` | which folder in `api/templates/` styles the emails (public, not encrypted). Unknown or empty → `default` |

### 4. Build and publish

```bash
npm run build
```

The build encrypts the settings and bakes the token into `dist/client`. Publish that folder as usual (see [DEPLOY.md](DEPLOY.md)). **Any change to the SMTP settings means rebuilding and publishing the site again.** The server doesn't need touching.

## Testing locally

The two sides keep separate env files here too, as they will on separate hosts:

| File | Belongs to | Holds |
|---|---|---|
| `.env` (project root) | the site | the `SMTP_*` settings + the fixed key |
| `api/.env` | `send-mail.php` | the fixed key + `ALLOWED_ORIGINS` only |

`npm run dev` runs `api/send-mail.php`, which reads only `api/.env`. Send an RSVP or wish from the site and it arrives in your Mailtrap inbox.

To check it from the terminal while `npm run dev` is running (use your dev server's port):

```bash
TOKEN=$(npm run -s mail:token)
curl -s -X POST http://localhost:5173/send-mail.php \
  -H "Origin: http://localhost:5173" -H "Content-Type: application/json" \
  -d "{\"type\":\"wish\",\"name\":\"Test\",\"text\":\"Hello\",\"elapsed\":\"5000\",\"credentials\":\"$TOKEN\"}"
```

You should get `{"ok":true}`. The same request without `credentials` gets `{"ok":false,"error":"config"}`, because the mail server has no SMTP settings of its own. A token made with a different key gets `{"ok":false,"error":"credentials"}`.

## Adding another invitation

1. Copy this project (or use any site that can make a `POST` request).
2. Give its `.env` that couple's SMTP settings and the **same** `MAIL_ENCRYPTION_KEY`.
3. Make its email template: copy a folder in `api/templates/` (e.g. `khaled-shorouk` → `ahmed-sara`), change the names, date and colours, and upload it to the mail server. See [api/templates/README.md](api/templates/README.md).
4. Set `VITE_MAIL_TEMPLATE=ahmed-sara` in its `.env`.
5. Add its address to the server's `ALLOWED_ORIGINS`.
6. Build and publish.

### A site that isn't built with this project (e.g. a plain HTML page)

Write its settings in a `.env`-style file and print its token:

```bash
npm run mail:token path/to/that-site.env
```

Then send it with each request:

```js
fetch("https://api.example.com/send-mail.php", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "rsvp",                // or "wish" (then also send: text)
    name: "Ahmed",
    attending: "yes",
    guests: "2",
    elapsed: String(Date.now() - pageOpenedAt), // ms since the page opened; must be ≥ 2000
    template: "khaled-shorouk",  // its folder in api/templates/
    credentials: "<the token>",
  }),
});
```

## The token's format

```
base64url(  IV (12 bytes)  |  GCM tag (16 bytes)  |  ciphertext  )

ciphertext = AES-256-GCM( key = base64-decoded MAIL_ENCRYPTION_KEY (32 bytes),
                          plaintext = {"host","port","secure","user","pass","from","to"} as JSON )
```

- Made by `encryptMailCredentials()` in `scripts/mail-credentials.mjs`, which `vite.config.ts` calls during the build and exposes as `import.meta.env.VITE_MAIL_CREDENTIALS`.
- Read by `decrypt_credentials()` in `api/send-mail.php`.

Every build makes a different token (random IV), even for the same settings. That's expected.

## Answers from the script

| Answer | Meaning |
|---|---|
| `{"ok":true}` | sent |
| `{"ok":false,"error":"credentials"}` | the token can't be decrypted: the keys differ between the site and the server, or the token was changed |
| `{"ok":false,"error":"config"}` | a setting is missing or invalid (e.g. no `SMTP_HOST`, or `SMTP_FROM` isn't an email address) |
| `{"ok":false,"error":"send"}` | the mail server refused: wrong password, port, or host |
| `{"ok":false,"error":"origin"}` (403) | the site isn't in `ALLOWED_ORIGINS` |
| `{"ok":false,"error":"rate"}` (429) | too many messages from one visitor (6 per 10 minutes) |
| `{"ok":false,"error":"invalid"}` | missing name or message, or sent too quickly after the page opened |

For `credentials`, `config` and `send`, the server's PHP error log has a line starting `send-mail:` that says exactly what went wrong.

## Fallback

A request **without** a token uses any `SMTP_*` values in the server's own `.env`. That's how it worked before. If the server's `.env` has none, such requests get `config`. A site built without `MAIL_ENCRYPTION_KEY` sends no token, and the build warns about it.
