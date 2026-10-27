/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Full https URL of the hosted api/send-mail.php, from VITE_MAIL_ENDPOINT in .env (public, not a secret).
   * Not optional: vite.config.ts refuses to build without it, so there is no default to fall back to.
   */
  readonly VITE_MAIL_ENDPOINT: string;
  /** This invitation's recipient, encrypted at build time from .env (see EMAIL.md). */
  readonly VITE_MAIL_CREDENTIALS?: string;
  /** The email template for this invitation: a folder name in api/templates/ (public, not a secret). */
  readonly VITE_MAIL_TEMPLATE?: string;
}
