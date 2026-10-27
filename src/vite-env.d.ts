/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full https URL of the hosted api/send-mail.php, baked in at build time (public, not a secret). */
  readonly VITE_MAIL_ENDPOINT?: string;
  /** This invitation's whole SMTP setup, encrypted at build time from .env (see EMAIL.md). */
  readonly VITE_MAIL_CREDENTIALS?: string;
  /** The email template for this invitation: a folder name in api/templates/ (public, not a secret). */
  readonly VITE_MAIL_TEMPLATE?: string;
}
