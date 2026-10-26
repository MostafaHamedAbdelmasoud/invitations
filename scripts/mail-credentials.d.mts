export const CREDENTIAL_KEYS: readonly string[];
export function encryptMailCredentials(env: Record<string, string | undefined>): string;
export function readEnvFile(path: string | URL): Record<string, string>;
