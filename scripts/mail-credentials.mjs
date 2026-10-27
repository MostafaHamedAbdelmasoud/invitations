// Encrypts one invitation's whole mail setup (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM,
// SMTP_TO) for api/send-mail.php, so a single hosted script can send for many invitations, each with its own mail
// server and account. See EMAIL.md.
//
// The token is AES-256-GCM with MAIL_ENCRYPTION_KEY (the same key in this project's .env and the server's .env).
// It's made at build time, so only the token reaches the public site; the key and the plain password never do.
// Without the key nobody can read the token, change it (e.g. point SMTP_TO elsewhere), or make one of their own.
//
//   node scripts/mail-credentials.mjs key     a new random MAIL_ENCRYPTION_KEY
//   node scripts/mail-credentials.mjs token   the token for the account in .env (for a site that isn't built here)

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CREDENTIAL_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_TO"];

/**
 * Token format: base64url( 12-byte IV | 16-byte GCM tag | ciphertext of
 * {"host","port","secure","user","pass","from","to"} ). SMTP_SECURE is optional (default "false").
 */
export function encryptMailCredentials(env) {
  const key = Buffer.from(env.MAIL_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("MAIL_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  const missing = CREDENTIAL_KEYS.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing ${missing.join(", ")}`);

  const plain = JSON.stringify({
    host: env.SMTP_HOST,
    port: String(env.SMTP_PORT),
    secure: env.SMTP_SECURE || "false",
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
    to: env.SMTP_TO,
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
