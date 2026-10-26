/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full https URL of the hosted api/send-mail.php, baked in at build time (public, not a secret). */
  readonly VITE_MAIL_ENDPOINT?: string;
  /** This invitation's mail account, encrypted at build time from .env (see scripts/mail-credentials.mjs). */
  readonly VITE_MAIL_CREDENTIALS?: string;
}
