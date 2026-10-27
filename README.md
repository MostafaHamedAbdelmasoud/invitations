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

`dist/client` is a complete static site for GitHub Pages (custom domain via `public/CNAME`). The live email API's URL comes from `.env.production` (`VITE_MAIL_ENDPOINT=https://api.maryamandmahmoud.com/send-mail.php`), which is also the default in code, so `npm run dev` calls the same live API.

The music file is `public/wedding-song.mp3`.

## Email (RSVPs and wishes)

The forms post to the email API, `api/send-mail.php`, hosted on its own server with its own `.env` (`api/.env`: the fixed key, allowed sites, and the one account everything sends from). Each RSVP and wish carries only this couple's address, encrypted at build time, so no invitation ever holds a mailbox password. One script can serve many invitations. It only accepts browser calls from `ALLOWED_ORIGINS`. See [EMAIL.md](EMAIL.md). Guests' own answers are also remembered in their browser.

`npm run dev` posts to the same hosted API as production (wedding-api-2, docker compose), so the forms really send email in development. The recipient and template come from the project's `.env`; the API's `ALLOWED_ORIGINS` must include `http://localhost:5173`.

## Deploy

See [DEPLOY.md](DEPLOY.md): the API on Hostinger first, then the site on GitHub Pages.
