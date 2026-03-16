// src/parser.ts

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Parses .env file content into key-value pairs
 * Supports:
 * - Comments (#)
 * - Quoted values (single, double, backtick)
 * - Multiline values (with double quotes)
 * - Inline comments
 * - Empty lines
 * - export prefix
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split('\n')

  let currentKey: string | null = null
  let currentValue: string[] = []
  let multiline = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Handle multiline continuation
    if (multiline && currentKey) {
      if (rawLine.includes('"')) {
        const endIdx = rawLine.indexOf('"')
        currentValue.push(rawLine.slice(0, endIdx))
        result[currentKey] = currentValue.join('\n')
        currentKey = null
        currentValue = []
        multiline = false
      } else {
        currentValue.push(rawLine)
      }
      continue
    }

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue

    // Remove 'export ' prefix
    const cleanLine = line.startsWith('export ') ? line.slice(7) : line

    // Find the = separator
    const eqIdx = cleanLine.indexOf('=')
    if (eqIdx === -1) continue

    const key = cleanLine.slice(0, eqIdx).trim()
    let value = cleanLine.slice(eqIdx + 1).trim()

    // Handle quoted values
    if (value.startsWith('"')) {
      const closingQuote = value.indexOf('"', 1)
      if (closingQuote === -1) {
        // Multiline value
        currentKey = key
        currentValue = [value.slice(1)]
        multiline = true
        continue
      }
      value = value.slice(1, closingQuote)
    } else if (value.startsWith("'")) {
      const closingQuote = value.indexOf("'", 1)
      if (closingQuote !== -1) {
        value = value.slice(1, closingQuote)
      }
    } else if (value.startsWith('`')) {
      const closingQuote = value.indexOf('`', 1)
      if (closingQuote !== -1) {
        value = value.slice(1, closingQuote)
      }
    } else {
      // Remove inline comments
      const commentIdx = value.indexOf(' #')
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim()
      }
    }

    result[key] = value
  }

  return result
}

/**
 * Loads .env file(s) and merges with process.env
 */
export function loadEnvFiles(
  paths: string | string[],
  override: boolean = false
): Record<string, string> {
  const filePaths = Array.isArray(paths) ? paths : [paths]
  const loaded: Record<string, string> = {}

  for (const filePath of filePaths) {
    const absPath = resolve(process.cwd(), filePath)

    if (!existsSync(absPath)) continue

    try {
      const content = readFileSync(absPath, 'utf-8')
      const parsed = parseEnvContent(content)

      for (const [key, value] of Object.entries(parsed)) {
        loaded[key] = value

        if (override || process.env[key] === undefined) {
          process.env[key] = value
        }
      }
    } catch {
      // Silently skip unreadable files
    }
  }

  return loaded
}