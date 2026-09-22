/**
 * Development checks, as `@iiiivaska/prism-tokens` makes them: on unless the bundler replaced
 * `process.env.NODE_ENV` with "production". The package reads no other environment.
 */
export function isDevelopment(): boolean {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;
  return env?.NODE_ENV !== "production";
}
