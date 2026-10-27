# Mahmoud & Maryam Wedding Invitation

Arabic-default invitation (navy & gold design from `maryam-mahmoud-invite/index.html`) with an English toggle, swipe-through screens and background music.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # static site in dist/client (prerendered) — push its contents to GitHub Pages
```

`dist/client` is a complete static site for GitHub Pages (custom domain via `public/CNAME`). The build's settings come from **`config.json`** (copy `config.example.json`): the email API's URL, the email template, the site base, and where `send-mail.php` lives for local dev. None of it is secret, so it's committed. The build stops with a `[site-config]` message if anything is missing or malformed.

The two secrets — the couple's address and the encryption key — stay in `.env`, which git never sees. **This repo is public**, so an email address committed to it would be scraped.

The music file is `public/wedding-song.mp3`.

## Email (RSVPs and wishes)

The forms post to the email API, `api/send-mail.php`, hosted on its own server with its own `.env` (`api/.env`: the fixed key, allowed sites, and the one account everything sends from). Each RSVP and wish carries only this couple's address, encrypted at build time, so no invitation ever holds a mailbox password. One script can serve many invitations. It only accepts browser calls from `ALLOWED_ORIGINS`. See [EMAIL.md](EMAIL.md). Guests' own answers are also remembered in their browser.

`npm run dev` runs `send-mail.php` locally with PHP's built-in server (from `devApiDir` in `config.json`) and proxies `devEndpoint` to it, so the forms really send email in development **without touching the live API**. The local script uses that folder's own `.env`. Point `devEndpoint` at a full `https://` URL instead if you'd rather hit the hosted API; then its `ALLOWED_ORIGINS` must include `http://localhost:5173`.

## Deploy

See [DEPLOY.md](DEPLOY.md): the API on Hostinger first, then the site on GitHub Pages.
