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

The forms post to the email API, `api/send-mail.php`, hosted separately on Hostinger with `.env` one folder above it. It emails each RSVP and wish through the SMTP server in `.env` (see `.env.example`), and only accepts browser calls from `ALLOWED_ORIGINS`. Guests' own answers are also remembered in their browser.

`npm run dev` runs `api/send-mail.php` through PHP's built-in server (PHP must be installed), so the forms really send email in development using the project's `.env`.

## Deploy

See [DEPLOY.md](DEPLOY.md): the API on Hostinger first, then the site on GitHub Pages.
