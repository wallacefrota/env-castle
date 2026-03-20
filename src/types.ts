// src/types.ts

export type EnvType =
  | 'string'
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'port'
  | 'url'
  | 'email'
  | 'host'
  | 'json'
  | 'list'
  | 'enum'
  | 'duration'
  | 'regex'
  | 'ip'
  | 'path'

export interface BaseRule {
  type: EnvType
  required?: boolean
  desc?: string
}

export interface StringRule extends BaseRule {
  type: 'string'
  default?: string
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

export interface NumberRule extends BaseRule {
  type: 'number' | 'integer' | 'float'
  default?: number
  min?: number
  max?: number
}

export interface BooleanRule extends BaseRule {
  type: 'boolean'
  default?: boolean
}

export interface PortRule extends BaseRule {
  type: 'port'
  default?: number
}

export interface UrlRule extends BaseRule {
  type: 'url'
  default?: string
  protocols?: string[]
}

export interface EmailRule extends BaseRule {
  type: 'email'
  default?: string
}

export interface HostRule extends BaseRule {
  type: 'host'
  default?: string
}

export interface JsonRule extends BaseRule {
  type: 'json'
  default?: any
}

export interface ListRule extends BaseRule {
  type: 'list'
  default?: string[]
  separator?: string
  itemType?: 'string' | 'number'
}

export interface EnumRule<T extends string = string> extends BaseRule {
  type: 'enum'
  values: readonly T[]
  default?: T
}

export interface DurationRule extends BaseRule {
  type: 'duration'
  default?: string | number
  min?: string | number
  max?: string | number
}

export interface RegexRule extends BaseRule {
  type: 'regex'
  default?: string
  pattern: RegExp
}

export interface IpRule extends BaseRule {
  type: 'ip'
  default?: string
  version?: 4 | 6
}

export interface PathRule extends BaseRule {
  type: 'path'
  default?: string
  mustExist?: boolean
}

export type Rule =
  | StringRule
  | NumberRule
  | BooleanRule
  | PortRule
  | UrlRule
  | EmailRule
  | HostRule
  | JsonRule
  | ListRule
  | EnumRule<any>
  | DurationRule
  | RegexRule
  | IpRule
  | PathRule

export type Schema = Record<string, Rule>

// ===== INFERENCE OF TYPES =====

type InferRule<R extends Rule> =
  R extends BooleanRule ? boolean :
  R extends NumberRule ? number :
  R extends PortRule ? number :
  R extends DurationRule ? number :
  R extends ListRule ? (R['itemType'] extends 'number' ? number[] : string[]) :
  R extends JsonRule ? any :
  R extends EnumRule<infer E> ? E :
  string

type IsRequired<R extends Rule> =
  R['required'] extends true ? true :
  R extends { default: any } ? false :
  R['required'] extends false ? false :
  true // default: required

export type InferSchema<S extends Schema> = {
  [K in keyof S]:
    IsRequired<S[K]> extends true
      ? InferRule<S[K]>
      : InferRule<S[K]> | undefined
}

export interface EnvError {
  key: string
  message: string
  value?: string
  rule: Rule
}

export interface CastleOptions {
  /** Path to .env file(s) */
  path?: string | string[]
  /** Override process.env values with .env file values */
  override?: boolean
  /** Custom source (for testing) */
  source?: Record<string, string | undefined>
  /** Prefix to filter env vars (e.g., 'APP_') */
  prefix?: string
  /** Strip prefix from keys in result */
  stripPrefix?: boolean
  /** Exit process on validation error (default: true) */
  exitOnError?: boolean
}
