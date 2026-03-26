// src/index.ts

import type { Schema, InferSchema, CastleOptions, EnvError } from './types'
import { loadEnvFiles } from './parser'
import { validateVar } from './validators'
import { formatErrors, formatSuccess } from './formatters'

export type { Schema, CastleOptions, EnvError }
export type {
  Rule,
  StringRule,
  NumberRule,
  BooleanRule,
  PortRule,
  UrlRule,
  EmailRule,
  HostRule,
  JsonRule,
  ListRule,
  EnumRule,
  DurationRule,
  RegexRule,
  IpRule,
  PathRule,
  InferSchema,
} from './types'

/**
 * Validates environment variables against a schema.
 * Returns a fully typed, validated config object.
 *
 * @example
 * ```ts
 * const config = env({
 *   PORT: { type: 'port', default: 3000 },
 *   DATABASE_URL: { type: 'url', required: true },
 *   DEBUG: { type: 'boolean', default: false },
 * })
 *
 * config.PORT // number
 * config.DATABASE_URL // string
 * config.DEBUG // boolean
 * ```
 */
export function env<S extends Schema>(
  schema: S,
  options: CastleOptions = {}
): InferSchema<S> {
  const {
    path: envPath,
    override = false,
    source,
    prefix,
    stripPrefix = false,
    exitOnError = true,
  } = options

  // Step 1: Load .env file(s) if specified
  if (envPath) {
    loadEnvFiles(envPath, override)
  }

  // Step 2: Determine source of env vars
  const envSource = source ?? (process.env as Record<string, string | undefined>)

  // Step 3: Validate each variable
  const errors: EnvError[] = []
  const result: Record<string, any> = {}

  for (const [key, rule] of Object.entries(schema)) {
    const envKey = prefix ? `${prefix}${key}` : key
    const raw = envSource[envKey]

    const [value, error] = validateVar(envKey, raw, rule)

    if (error) {
      errors.push(error)
    } else {
      const resultKey = prefix && stripPrefix ? key : envKey
      result[resultKey] = value
    }
  }

  // Step 4: Handle errors
  if (errors.length > 0) {
    const message = formatErrors(errors)
    console.error(message)

    if (exitOnError) {
      process.exit(1)
    }

    throw new EnvValidationError(errors, message)
  }

  // Step 5: Success log (only in development)
  if (envSource['NODE_ENV'] !== 'test') {
    const keys = Object.keys(schema)
    console.log(formatSuccess(keys, prefix))
  }

  return Object.freeze(result) as InferSchema<S>
}

/**
 * Same as `env()` but doesn't exit process — throws instead.
 * Useful for testing.
 */
export function envSafe<S extends Schema>(
  schema: S,
  options: Omit<CastleOptions, 'exitOnError'> = {}
): InferSchema<S> {
  return env(schema, { ...options, exitOnError: false })
}

/**
 * Creates a prefixed env loader
 *
 * @example
 * ```ts
 * const dbEnv = envGroup('DB_', {
 *   HOST: { type: 'host', default: 'localhost' },
 *   PORT: { type: 'port', default: 5432 },
 *   NAME: { type: 'string', required: true },
 * })
 *
 * // Reads DB_HOST, DB_PORT, DB_NAME
 * dbEnv.HOST // string
 * dbEnv.PORT // number
 * ```
 */
export function envGroup<S extends Schema>(
  prefix: string,
  schema: S,
  options: Omit<CastleOptions, 'prefix' | 'stripPrefix'> = {}
): InferSchema<S> {
  return env(schema, { ...options, prefix, stripPrefix: true })
}

/**
 * Validates a single env var. Returns the value or undefined.
 *
 * @example
 * ```ts
 * const port = envVar('PORT', { type: 'port', default: 3000 })
 * ```
 */
export function envVar<R extends import('./types').Rule>(
  key: string,
  rule: R,
  source?: Record<string, string | undefined>
): R extends { required: true } ? NonNullable<inferSingle<R>> : inferSingle<R> {
  const envSource = source ?? (process.env as Record<string, string | undefined>)
  const raw = envSource[key]
  const [value, error] = validateVar(key, raw, rule)

  if (error) {
    const message = formatErrors([error])
    throw new EnvValidationError([error], message)
  }

  return value
}

/**
 * Just loads .env file(s) into process.env — no validation.
 *
 * @example
 * ```ts
 * // ESM
 * import { load } from 'env-castle'
 * load()
 *
 * // CJS
 * require('env-castle').load()
 * ```
 */
export function load(options: {
  path?: string | string[]
  override?: boolean
} = {}): void {
  const {
    path: envPath = '.env',
    override = false,
  } = options

  loadEnvFiles(envPath, override)
}

// Helper type for single var inference (internal)
type inferSingle<R extends import('./types').Rule> =
  R extends import('./types').BooleanRule ? boolean :
  R extends import('./types').NumberRule ? number :
  R extends import('./types').PortRule ? number :
  R extends import('./types').DurationRule ? number :
  R extends import('./types').ListRule ? string[] :
  R extends import('./types').JsonRule ? any :
  R extends import('./types').EnumRule<infer E extends string> ? E :
  string | undefined

/**
 * Custom error class for env validation failures
 */
export class EnvValidationError extends Error {
  public errors: EnvError[]

  constructor(errors: EnvError[], formattedMessage: string) {
    super(`Environment validation failed: ${errors.length} error(s)`)
    this.name = 'EnvValidationError'
    this.errors = errors

    // Preserve formatted message for logging
    Object.defineProperty(this, 'formattedMessage', {
      value: formattedMessage,
      enumerable: false,
    })
  }
}
