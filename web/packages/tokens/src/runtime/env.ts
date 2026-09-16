/**
 * Whether the checks that ADR-0019 and ADR-0020 describe as development-time run.
 *
 * `process.env.NODE_ENV` is read off `globalThis` so the module needs no Node types and works in a
 * browser, where `process` is absent and the answer is "development". A bundler that defines
 * `process.env.NODE_ENV = "production"` turns the checks off.
 */
export function isDevelopment(): boolean {
  const scope = globalThis as { process?: { env?: { NODE_ENV?: string } } };
  return scope.process?.env?.NODE_ENV !== "production";
}
