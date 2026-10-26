/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full https URL of the hosted api/send-mail.php, baked in at build time (public, not a secret). */
  readonly VITE_MAIL_ENDPOINT?: string;
}
