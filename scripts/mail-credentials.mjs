// Encrypts this invitation's recipient (SMTP_TO) for api/send-mail.php, so a single hosted script can send for many
// invitations. The sending account lives once in the mail server's .env, so an invitation never carries that
// password and the couple never has to hand over a mailbox login of their own. See EMAIL.md.
//
// A site that must send through its own account can still set SMTP_HOST / PORT / SECURE / USER / PASS / FROM here;
// whatever is set goes into the token and overrides the server's .env for that site alone.
//
// The token is AES-256-GCM with MAIL_ENCRYPTION_KEY (the same key in this project's .env and the server's .env).
// It's made at build time, so only the token reaches the public site; the key never does.
// Without the key nobody can read the token, change it (e.g. point SMTP_TO elsewhere), or make one of their own.
//
//   node scripts/mail-credentials.mjs key     a new random MAIL_ENCRYPTION_KEY
//   node scripts/mail-credentials.mjs token   the token for the account in .env (for a site that isn't built here)

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** All the token can carry. Only SMTP_TO is required; the rest default to the mail server's own .env. */
export const CREDENTIAL_KEYS = ["SMTP_TO"];
const OPTIONAL_KEYS = {
  SMTP_HOST: "host",
  SMTP_PORT: "port",
  SMTP_SECURE: "secure",
  SMTP_USER: "user",
  SMTP_PASS: "pass",
  SMTP_FROM: "from",
};

/**
 * Token format: base64url( 12-byte IV | 16-byte GCM tag | ciphertext of {"to", …} ).
 * Only "to" is always there; host / port / secure / user / pass / from appear only if .env sets them.
 */
export function encryptMailCredentials(env) {
  const key = Buffer.from(env.MAIL_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("MAIL_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  const missing = CREDENTIAL_KEYS.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing ${missing.join(", ")}`);

  const plain = JSON.stringify({
    to: env.SMTP_TO,
    ...Object.fromEntries(
      Object.entries(OPTIONAL_KEYS)
        .filter(([name]) => env[name])
        .map(([name, field]) => [field, String(env[name])]),
    ),
  });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

/** Minimal .env reader (same rules as send-mail.php's load_env). */
export function readEnvFile(path) {
  const env = {};
  for (let line of readFileSync(path, "utf8").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const at = line.indexOf("=");
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0])) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === "key") {
    console.log(randomBytes(32).toString("base64"));
  } else if (command === "token") {
    const envPath = process.argv[3] ?? new URL("../.env", import.meta.url);
    console.log(encryptMailCredentials(readEnvFile(envPath)));
  } else {
    console.error("usage: node scripts/mail-credentials.mjs key | token [path/to/.env]");
    process.exit(1);
  }
}
