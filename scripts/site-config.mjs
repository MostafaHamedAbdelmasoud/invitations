// This invitation's build settings, read from config.json (see config.example.json). Everything here is public:
// it ends up in the built site, so it is plain JSON in the repo rather than a .env file.
//
// The two things that are NOT here are the two that must stay private, in .env:
//   SMTP_TO              the couple's email address (this repo is public; an address in it is scraped by bots)
//   MAIL_ENCRYPTION_KEY  the key the recipient is encrypted with
//
// Any value below can still be overridden for one build by an environment variable, which is handy in CI:
//   SITE_CONFIG=../other.json  VITE_MAIL_ENDPOINT=…  VITE_MAIL_TEMPLATE=…  SITE_BASE=…

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TEMPLATE = /^[a-z0-9][a-z0-9_-]{0,63}$/; // same rule send-mail.php uses to find templates/<name>/

function fail(message) {
  throw new Error(`[site-config] ${message}`);
}

/** A full https URL, or http on localhost. Returns the parsed URL so the caller can read its port. */
function checkUrl(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${field} is not a full URL: "${value}"`);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // the live site is https, and a browser blocks an http call from it as mixed content
  if (url.protocol !== "https:" && !local)
    fail(`${field} must be https (or localhost): "${value}"`);
  return url;
}

/**
 * Reads and checks config.json. `mode` is vite's: in "development" the endpoint is `devEndpoint`, so RSVPs go to
 * the PHP server vite starts locally instead of the live API.
 */
export function loadSiteConfig(mode, root, env = process.env) {
  const path = resolve(root, env.SITE_CONFIG || "config.json");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`no ${path}. Copy config.example.json to config.json and fill it in.`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    fail(`${path} is not valid JSON: ${e.message}`);
  }

  const dev = mode === "development";
  const template = env.VITE_MAIL_TEMPLATE || config.template;
  const base = env.SITE_BASE || config.base || "/";
  const endpoint = env.VITE_MAIL_ENDPOINT || (dev ? config.devEndpoint : config.endpoint);

  if (!template)
    fail('no "template" in config.json: the folder in api/templates/ that styles the emails');
  if (!TEMPLATE.test(template))
    fail(`"template" must be a plain folder name, lowercase: "${template}"`);
  if (!base.startsWith("/") || !base.endsWith("/"))
    fail(`"base" must start and end with "/": "${base}"`);
  if (!endpoint) {
    fail(`no "${dev ? "devEndpoint" : "endpoint"}" in config.json: the email API's URL`);
  }
  // in dev the endpoint is normally just "/send-mail.php", proxied to the local PHP server by vite
  if (!endpoint.startsWith("/")) checkUrl(endpoint, dev ? '"devEndpoint"' : '"endpoint"');
  else if (!dev) fail(`"endpoint" must be a full URL, not a path: "${endpoint}"`);

  return { template, base, endpoint, devApiDir: config.devApiDir || "", path };
}
