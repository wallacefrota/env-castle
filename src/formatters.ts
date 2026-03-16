// src/formatters.ts

import type { EnvError } from './types'
import { maskValue } from './utils'

/**
 * Formats validation errors into a beautiful console output
 */
export function formatErrors(errors: EnvError[]): string {
  const lines: string[] = []

  const maxKeyLen = Math.max(...errors.map(e => e.key.length), 3)
  const width = Math.max(maxKeyLen + 40, 50)

  lines.push('')
  lines.push('╔' + '═'.repeat(width) + '╗')
  lines.push('║' + centerText('❌ ENV VALIDATION FAILED', width) + '║')
  lines.push('╠' + '═'.repeat(width) + '╣')

  for (const error of errors) {
    const displayValue = error.value ? ` (${maskValue(error.value, error.key)})` : ''
    const line = `  ${error.key.padEnd(maxKeyLen)}  →  ${error.message}${displayValue}`

    // Truncate if too long
    const truncated = line.length > width ? line.slice(0, width - 3) + '...' : line.padEnd(width)
    lines.push('║' + truncated + '║')

    // Show description if available
    if (error.rule.desc) {
      const desc = `  ${''.padEnd(maxKeyLen)}     ℹ ${error.rule.desc}`
      const truncDesc = desc.length > width ? desc.slice(0, width - 3) + '...' : desc.padEnd(width)
      lines.push('║' + truncDesc + '║')
    }
  }

  lines.push('╠' + '═'.repeat(width) + '╣')

  const summary = `  ${errors.length} error${errors.length > 1 ? 's' : ''} found. Fix your environment variables.`
  lines.push('║' + summary.padEnd(width) + '║')

  lines.push('╚' + '═'.repeat(width) + '╝')
  lines.push('')

  return lines.join('\n')
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, width - text.length)
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + text + ' '.repeat(right)
}

/**
 * Formats a success summary
 */
export function formatSuccess(keys: string[], prefix?: string): string {
  const label = prefix ? ` (prefix: ${prefix})` : ''
  return `✅ env-castle: ${keys.length} variables validated${label}`
}