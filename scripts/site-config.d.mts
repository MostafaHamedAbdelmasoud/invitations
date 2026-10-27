export interface SiteConfig {
  /** Folder in api/templates/ on the mail server that styles this invitation's emails. */
  template: string;
  /** Where the site is served from, e.g. "/" or "/khaled-shorouk/". Starts and ends with "/". */
  base: string;
  /** The email API this build posts to: a full https URL, or in dev a path vite proxies to the local PHP server. */
  endpoint: string;
  /** Folder holding send-mail.php for `npm run dev`. Empty to skip the local PHP server. */
  devApiDir: string;
  /** The config.json that was read. */
  path: string;
}

export function loadSiteConfig(
  mode: string,
  root: string,
  env?: Record<string, string | undefined>,
): SiteConfig;
