# How the RSVP and wishes emails work

One copy of `api/send-mail.php` on the server sends email for **any number of invitations**. The mail goes out through **one account you own**, which lives on the mail server and nowhere else. An invitation carries only the couple's own address (encrypted) and the name of its **email template**, a folder in `api/templates/` with its HTML, names, date and colours.

So you never have to ask a couple for their mailbox password, and no site ever holds one.

## The idea

```
 ┌─────────────── site project (.env, private) ───────────────┐
 │ SMTP_TO             ← just the couple's address             │
 │ MAIL_ENCRYPTION_KEY ──┐                                     │
 └───────────────────────┼─────────────────────────────────────┘
                         │  npm run build
                         ▼
        AES-256-GCM encrypt → one token (unreadable text)
                         │
                         ▼
 ┌──────────── public site (dist/client) ────────────┐
 │ contains ONLY the token                            │
 │ (no key, no password, not even the address)        │
 └──────────────────────┬─────────────────────────────┘
                        │  guest sends an RSVP or wish:
                        │  POST { type, name, …, template, credentials: <token> }
                        ▼
 ┌──── mail server (another host): send-mail.php ────┐
 │ its own .env:  MAIL_ENCRYPTION_KEY  (same fixed key)│
 │        ALLOWED_ORIGINS                              │
 │        SMTP_HOST/PORT/USER/PASS/FROM  ← the one     │
 │        sending account, for every site              │
 │                                                     │
 │ 1. checks the site is in ALLOWED_ORIGINS            │
 │ 2. decrypts the token → the couple's address        │
 │ 3. fills templates/<template>/email.html            │
 │ 4. logs in as SMTP_USER and sends from SMTP_FROM    │
 │    to the address the token held                    │
 └─────────────────────────────────────────────────────┘
```

The encryption runs at **build time**, not in the guest's browser. If the browser did the encrypting, the key would have to be in the public site, and anyone could use it. This way the key stays in your two private `.env` files.

**Why the address is encrypted rather than just posted as a field:** if a site could name any recipient, so could anyone else who found the API. They'd be able to send mail from your domain to whoever they liked. Locked inside the token, a site can only ever mail its own couple.

## Why it's safe to put the token in a public site

- **It can't be read.** Without `MAIL_ENCRYPTION_KEY` the token is just random-looking text.
- **It can't be changed.** AES-GCM is *authenticated*: changing even one character (to send the emails somewhere else, say) makes decryption fail, and the script answers `{"ok":false,"error":"credentials"}`.
- **Nobody can make their own.** Without the key, nobody can create a token that makes your server send mail to an address of their choosing.
- **There is no password in it at all.** Even if the key leaked, a token reveals one email address — not a mailbox login. The sending account is only ever on the mail server.
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
├── .env             ← its own: the fixed key, allowed sites, and the one sending account
└── templates/       ← one folder per invitation's email (see api/templates/README.md)
    ├── default/
    ├── khaled-shorouk/
    └── mahmoud-maryam/
```

```dotenv
# api/.env
MAIL_ENCRYPTION_KEY=k3J…=          # the fixed key
ALLOWED_ORIGINS=https://khaled-shorouk.com,https://another-wedding.com

# the one account every invitation sends through. This password lives here and nowhere else.
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=admin@vowlyeg.com
SMTP_PASS=…
SMTP_FROM="Vowly <admin@vowlyeg.com>"
```

The domain you send from needs **SPF, DKIM and DMARC** DNS records, or Gmail will put the mail in spam or refuse it. Your mail provider gives you the first two; DMARC is a `TXT` record on `_dmarc` such as `v=DMARC1; p=none; rua=mailto:admin@vowlyeg.com`.

Upload all of it together. Add each invitation's address to `ALLOWED_ORIGINS`. The script looks for its `.env` beside itself first, then one folder up. Keeping it one folder up (outside the web root) is safest, and on an **nginx** host it's required, because nginx ignores `.htaccess`.

### 3. Each site project's `.env`

All a couple has to give you is their email address. No password, no app password, no access to their mailbox.

Settings are split by whether they're secret. **`.env` holds only the secrets** and is never committed:

```dotenv
SMTP_TO=khaled@example.com,shorouk@example.com
MAIL_ENCRYPTION_KEY=k3J…=
```

**`config.json` holds the rest** and is committed, because none of it is sensitive and the build needs it to be reproducible:

```json
{
  "template": "khaled-shorouk",
  "base": "/khaled-shorouk/",
  "endpoint": "https://api.example.com/send-mail.php",
  "devEndpoint": "/send-mail.php",
  "devApiDir": "../wedding-api-2/public"
}
```

| Setting | Where | Meaning |
|---|---|---|
| `SMTP_TO` | `.env` | where RSVPs and wishes go: the couple's address. Separate several with commas |
| `MAIL_ENCRYPTION_KEY` | `.env` | the fixed key, identical to the server's |
| `template` | `config.json` | which folder in `api/templates/` styles the emails. Unknown or empty → `default` |
| `base` | `config.json` | where the site is served from: `/` for its own domain, `/<repo>/` for a GitHub Pages project site |
| `endpoint` | `config.json` | the email API's full https URL, used by `npm run build` |
| `devEndpoint` | `config.json` | the API for `npm run dev`. A path like `/send-mail.php` is proxied to a local PHP server; a full URL goes straight there |
| `devApiDir` | `config.json` | the folder holding `send-mail.php` for that local server. Empty to skip it |

**The couple's address belongs in `.env`, not `config.json`.** This repo is public, and an address committed to it gets scraped by spam bots. The build keeps it out of the published site too, by encrypting it into the token.

For a one-off build you can override `config.json` from the environment: `SITE_CONFIG`, `VITE_MAIL_ENDPOINT`, `VITE_MAIL_TEMPLATE` and `SITE_BASE` all win if set.

**Sending through this invitation's own account instead.** Rarely needed, but if a couple insists their RSVPs come from their own mailbox, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM` here too. Anything you set is baked into that site's token and overrides the server's account for that site alone. Then you *are* back to holding someone's password, so prefer not to.

### 4. Build and publish

```bash
npm run build
```

The build encrypts `SMTP_TO` and bakes the token into `dist/client`. Publish that folder as usual (see [DEPLOY.md](DEPLOY.md)). **Changing where a couple's mail goes means rebuilding and publishing that site again.** Changing the *sending* account is now a server-side edit only: update `api/.env` and every site keeps working, with nothing to rebuild.

## Testing locally

The two sides keep separate env files here too, as they will on separate hosts:

| File | Belongs to | Holds |
|---|---|---|
| `.env` (project root) | the site | `SMTP_TO` + the fixed key |
| `api/.env` | `send-mail.php` | the fixed key, `ALLOWED_ORIGINS`, and the sending account |

`npm run dev` posts to the same hosted API as production (`https://api.maryamandmahmoud.com/send-mail.php`, wedding-api-2), so its `ALLOWED_ORIGINS` must include `http://localhost:5173`. Send an RSVP or wish from the site and it arrives in your inbox.

To check it from the terminal:

```bash
TOKEN=$(npm run -s mail:token)
curl -s -X POST https://api.maryamandmahmoud.com/send-mail.php \
  -H "Origin: http://localhost:5173" -H "Content-Type: application/json" \
  -d "{\"type\":\"wish\",\"name\":\"Test\",\"text\":\"Hello\",\"elapsed\":\"5000\",\"credentials\":\"$TOKEN\"}"
```

You should get `{"ok":true}`. A token made with a different key gets `{"ok":false,"error":"credentials"}`. A request with no `credentials` at all gets `config`, because the server knows the account to send *from* but not the address to send *to*.

## Adding another invitation

1. Copy this project (or use any site that can make a `POST` request).
2. Put that couple's address in its `.env` as `SMTP_TO`, with the **same** `MAIL_ENCRYPTION_KEY`.
3. Make its email template: copy a folder in `api/templates/` (e.g. `khaled-shorouk` → `ahmed-sara`), change the names, date and colours, and upload it to the mail server. See [api/templates/README.md](api/templates/README.md).
4. Set `VITE_MAIL_TEMPLATE=ahmed-sara` in its `.env`.
5. Add its address to the server's `ALLOWED_ORIGINS`.
6. Build and publish.

### A site that isn't built with this project (e.g. a plain HTML page)

Write its `SMTP_TO` and the key in a `.env`-style file and print its token:

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
                          plaintext = {"to"} as JSON )
```

Only `to` is always present. `host`, `port`, `secure`, `user`, `pass` and `from` appear **only** if that site's `.env` sets them, and then override the server's account for that site. Tokens made before this change carry all seven and still work unchanged.

- Made by `encryptMailCredentials()` in `scripts/mail-credentials.mjs`, which `vite.config.ts` calls during the build and exposes as `import.meta.env.VITE_MAIL_CREDENTIALS`.
- Read by `decrypt_credentials()` in `api/send-mail.php`.

Every build makes a different token (random IV), even for the same settings. That's expected.

## Answers from the script

| Answer | Meaning |
|---|---|
| `{"ok":true}` | sent |
| `{"ok":false,"error":"credentials"}` | the token can't be decrypted: the keys differ between the site and the server, or the token was changed |
| `{"ok":false,"error":"config"}` | a setting is missing or invalid: usually no `SMTP_TO` (no token was sent), or the server's `.env` is missing part of the sending account |
| `{"ok":false,"error":"send"}` | the mail server refused: wrong password, port, or host |
| `{"ok":false,"error":"origin"}` (403) | the site isn't in `ALLOWED_ORIGINS` |
| `{"ok":false,"error":"rate"}` (429) | too many messages from one visitor (6 per 10 minutes) |
| `{"ok":false,"error":"invalid"}` | missing name or message, or sent too quickly after the page opened |

For `credentials`, `config` and `send`, the server's PHP error log has a line starting `send-mail:` that says exactly what went wrong.

## Fallback

A request **without** a token falls back entirely to the server's own `.env`, including `SMTP_TO` if one is set there. Normally none is, so such requests get `config`. A site built without `MAIL_ENCRYPTION_KEY` sends no token, and the build warns about it.
