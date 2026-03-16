// src/utils.ts

/**
 * Parses duration strings like "30s", "5m", "2h", "1d" to milliseconds
 */
export function parseDuration(value: string | number): number {
  if (typeof value === 'number') return value

  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i)
  if (!match) {
    throw new Error(`Invalid duration: "${value}". Use format like "30s", "5m", "2h", "1d"`)
  }

  const num = parseFloat(match[1])
  const unit = match[2].toLowerCase()

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  }

  return Math.round(num * multipliers[unit])
}

/**
 * Masks sensitive values for error display
 */
export function maskValue(value: string, key: string): string {
  const sensitivePatterns = /secret|password|token|key|auth|private|credential/i
  if (sensitivePatterns.test(key)) {
    if (value.length <= 4) return '****'
    return value.slice(0, 2) + '****' + value.slice(-2)
  }
  if (value.length > 50) {
    return value.slice(0, 47) + '...'
  }
  return value
}

/**
 * Check if a string is a valid IP v4
 */
export function isIPv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every(p => {
    const n = parseInt(p, 10)
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p
  })
}

/**
 * Check if a string is a valid IP v6
 */
export function isIPv6(value: string): boolean {
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return ipv6Regex.test(value)
}