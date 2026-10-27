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

`dist/client` is a complete static site for GitHub Pages (custom domain via `public/CNAME`). The live email API's URL comes from `.env.production` (`VITE_MAIL_ENDPOINT=https://api.maryamandmahmoud.com/send-mail.php`); `npm run dev` uses the local PHP helper instead.

The music file is `public/wedding-song.mp3`.

## Email (RSVPs and wishes)

The forms post to the email API, `api/send-mail.php`, hosted on its own server with its own `.env` (`api/.env`: the fixed key + allowed sites). Each RSVP and wish carries this site's SMTP settings, encrypted at build time, and the script sends through them. One script can serve many invitations. It only accepts browser calls from `ALLOWED_ORIGINS`. See [EMAIL.md](EMAIL.md). Guests' own answers are also remembered in their browser.

`npm run dev` runs `api/send-mail.php` through PHP's built-in server (PHP must be installed), so the forms really send email in development. The script uses `api/.env`, and the site's SMTP settings come from the project's `.env`.

## Deploy

See [DEPLOY.md](DEPLOY.md): the API on Hostinger first, then the site on GitHub Pages.
