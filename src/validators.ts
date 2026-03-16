// src/validators.ts

import type { Rule, EnvError } from './types'
import { parseDuration, isIPv4, isIPv6 } from './utils'
import { existsSync } from 'node:fs'

/**
 * Validates and coerces a single environment variable
 * Returns [value, error]
 */
export function validateVar(
  key: string,
  raw: string | undefined,
  rule: Rule
): [any, EnvError | null] {

  // Check if missing
  const hasDefault = 'default' in rule && rule.default !== undefined
  const isRequired = rule.required !== undefined ? rule.required : !hasDefault

  if (raw === undefined || raw === '') {
    if (hasDefault) {
      const defaultVal = rule.type === 'duration' && typeof rule.default === 'string'
        ? parseDuration(rule.default as string)
        : rule.default
      return [defaultVal, null]
    }
    if (isRequired) {
      return [undefined, { key, message: 'missing (required)', rule }]
    }
    return [undefined, null]
  }

  // Validate by type
  try {
    switch (rule.type) {
      case 'string':
        return validateString(key, raw, rule)
      case 'number':
      case 'integer':
      case 'float':
        return validateNumber(key, raw, rule)
      case 'boolean':
        return validateBoolean(key, raw, rule)
      case 'port':
        return validatePort(key, raw, rule)
      case 'url':
        return validateUrl(key, raw, rule)
      case 'email':
        return validateEmail(key, raw, rule)
      case 'host':
        return validateHost(key, raw, rule)
      case 'json':
        return validateJson(key, raw, rule)
      case 'list':
        return validateList(key, raw, rule)
      case 'enum':
        return validateEnum(key, raw, rule)
      case 'duration':
        return validateDuration(key, raw, rule)
      case 'regex':
        return validateRegex(key, raw, rule)
      case 'ip':
        return validateIp(key, raw, rule)
      case 'path':
        return validatePath(key, raw, rule)
      default:
        return [raw, null]
    }
  } catch (err: any) {
    return [undefined, { key, message: err.message, value: raw, rule }]
  }
}

function validateString(key: string, raw: string, rule: Rule & { type: 'string' }): [any, EnvError | null] {
  const value = raw.trim()

  if (rule.minLength !== undefined && value.length < rule.minLength) {
    return [undefined, { key, message: `must be at least ${rule.minLength} characters (got ${value.length})`, value: raw, rule }]
  }
  if (rule.maxLength !== undefined && value.length > rule.maxLength) {
    return [undefined, { key, message: `must be at most ${rule.maxLength} characters (got ${value.length})`, value: raw, rule }]
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    return [undefined, { key, message: `does not match pattern ${rule.pattern}`, value: raw, rule }]
  }

  return [value, null]
}

function validateNumber(key: string, raw: string, rule: Rule & { type: 'number' | 'integer' | 'float' }): [any, EnvError | null] {
  const value = rule.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw)

  if (isNaN(value)) {
    return [undefined, { key, message: `"${raw}" is not a valid ${rule.type}`, value: raw, rule }]
  }
  if (rule.type === 'integer' && !Number.isInteger(value)) {
    return [undefined, { key, message: `"${raw}" is not an integer`, value: raw, rule }]
  }
  if (rule.min !== undefined && value < rule.min) {
    return [undefined, { key, message: `must be >= ${rule.min} (got ${value})`, value: raw, rule }]
  }
  if (rule.max !== undefined && value > rule.max) {
    return [undefined, { key, message: `must be <= ${rule.max} (got ${value})`, value: raw, rule }]
  }

  return [value, null]
}

function validateBoolean(key: string, raw: string, rule: Rule): [any, EnvError | null] {
  const truthy = ['true', '1', 'yes', 'on']
  const falsy = ['false', '0', 'no', 'off']
  const lower = raw.trim().toLowerCase()

  if (truthy.includes(lower)) return [true, null]
  if (falsy.includes(lower)) return [false, null]

  return [undefined, {
    key,
    message: `"${raw}" is not a valid boolean. Use: true/false, 1/0, yes/no, on/off`,
    value: raw,
    rule
  }]
}

function validatePort(key: string, raw: string, rule: Rule): [any, EnvError | null] {
  const value = parseInt(raw, 10)

  if (isNaN(value) || value < 0 || value > 65535 || !Number.isInteger(parseFloat(raw))) {
    return [undefined, { key, message: `"${raw}" is not a valid port (0-65535)`, value: raw, rule }]
  }

  return [value, null]
}

function validateUrl(key: string, raw: string, rule: Rule & { type: 'url' }): [any, EnvError | null] {
  try {
    const url = new URL(raw.trim())

    if (rule.protocols && rule.protocols.length > 0) {
      const protocol = url.protocol.replace(':', '')
      if (!rule.protocols.includes(protocol)) {
        return [undefined, {
          key,
          message: `protocol "${protocol}" not allowed. Allowed: ${rule.protocols.join(', ')}`,
          value: raw,
          rule
        }]
      }
    }

    return [raw.trim(), null]
  } catch {
    return [undefined, { key, message: `"${raw}" is not a valid URL`, value: raw, rule }]
  }
}

function validateEmail(key: string, raw: string, rule: Rule): [any, EnvError | null] {
  const value = raw.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(value)) {
    return [undefined, { key, message: `"${raw}" is not a valid email`, value: raw, rule }]
  }

  return [value, null]
}

function validateHost(key: string, raw: string, rule: Rule): [any, EnvError | null] {
  const value = raw.trim().toLowerCase()
  const hostRegex = /^(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

  if (!hostRegex.test(value) && !isIPv4(value)) {
    return [undefined, { key, message: `"${raw}" is not a valid hostname`, value: raw, rule }]
  }

  return [value, null]
}

function validateJson(key: string, raw: string, rule: Rule): [any, EnvError | null] {
  try {
    return [JSON.parse(raw), null]
  } catch {
    return [undefined, { key, message: `"${raw.slice(0, 50)}..." is not valid JSON`, value: raw, rule }]
  }
}

function validateList(key: string, raw: string, rule: Rule & { type: 'list' }): [any, EnvError | null] {
  const separator = rule.separator || ','
  const items = raw.split(separator).map(s => s.trim()).filter(Boolean)

  if (rule.itemType === 'number') {
    const numbers = items.map(Number)
    if (numbers.some(isNaN)) {
      return [undefined, { key, message: `list contains non-numeric values`, value: raw, rule }]
    }
    return [numbers, null]
  }

  return [items, null]
}

function validateEnum(key: string, raw: string, rule: Rule & { type: 'enum' }): [any, EnvError | null] {
  const value = raw.trim()

  if (!rule.values.includes(value)) {
    return [undefined, {
      key,
      message: `"${value}" is not one of: ${rule.values.join(', ')}`,
      value: raw,
      rule
    }]
  }

  return [value, null]
}

function validateDuration(key: string, raw: string, rule: Rule & { type: 'duration' }): [any, EnvError | null] {
  try {
    const ms = parseDuration(raw)

    if (rule.min !== undefined) {
      const minMs = typeof rule.min === 'string' ? parseDuration(rule.min) : rule.min
      if (ms < minMs) {
        return [undefined, { key, message: `duration must be >= ${rule.min} (got ${raw})`, value: raw, rule }]
      }
    }
    if (rule.max !== undefined) {
      const maxMs = typeof rule.max === 'string' ? parseDuration(rule.max) : rule.max
      if (ms > maxMs) {
        return [undefined, { key, message: `duration must be <= ${rule.max} (got ${raw})`, value: raw, rule }]
      }
    }

    return [ms, null]
  } catch (err: any) {
    return [undefined, { key, message: err.message, value: raw, rule }]
  }
}

function validateRegex(key: string, raw: string, rule: Rule & { type: 'regex' }): [any, EnvError | null] {
  if (!rule.pattern.test(raw)) {
    return [undefined, { key, message: `"${raw}" does not match pattern ${rule.pattern}`, value: raw, rule }]
  }
  return [raw, null]
}

function validateIp(key: string, raw: string, rule: Rule & { type: 'ip' }): [any, EnvError | null] {
  const value = raw.trim()

  if (rule.version === 4 || !rule.version) {
    if (isIPv4(value)) return [value, null]
    if (rule.version === 4) {
      return [undefined, { key, message: `"${raw}" is not a valid IPv4 address`, value: raw, rule }]
    }
  }

  if (rule.version === 6 || !rule.version) {
    if (isIPv6(value)) return [value, null]
  }

  return [undefined, { key, message: `"${raw}" is not a valid IP address`, value: raw, rule }]
}

function validatePath(key: string, raw: string, rule: Rule & { type: 'path' }): [any, EnvError | null] {
  const value = raw.trim()

  if (rule.mustExist && !existsSync(value)) {
    return [undefined, { key, message: `path "${value}" does not exist`, value: raw, rule }]
  }

  return [value, null]
}