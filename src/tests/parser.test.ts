import { describe, it, expect } from 'vitest'
import { parseEnvContent } from '../parser'

describe('parseEnvContent', () => {

  it('parses key=value', () => {
    const result = parseEnvContent('FOO=bar\nBAZ=qux')
    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('handles double quotes', () => {
    const result = parseEnvContent('MSG="hello world"')
    expect(result).toEqual({ MSG: 'hello world' })
  })

  it('handles single quotes', () => {
    const result = parseEnvContent("MSG='hello world'")
    expect(result).toEqual({ MSG: 'hello world' })
  })

  it('ignores comments', () => {
    const result = parseEnvContent('# comment\nFOO=bar')
    expect(result).toEqual({ FOO: 'bar' })
  })

  it('handles inline comments', () => {
    const result = parseEnvContent('FOO=bar # comment')
    expect(result).toEqual({ FOO: 'bar' })
  })

  it('handles empty lines', () => {
    const result = parseEnvContent('\nFOO=bar\n\nBAZ=qux\n')
    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('handles export prefix', () => {
    const result = parseEnvContent('export FOO=bar')
    expect(result).toEqual({ FOO: 'bar' })
  })

  it('handles values with equals', () => {
    const result = parseEnvContent('URL=postgres://host:5432/db?ssl=true')
    expect(result.URL).toBe('postgres://host:5432/db?ssl=true')
  })

  it('handles empty values', () => {
    const result = parseEnvContent('EMPTY=')
    expect(result).toEqual({ EMPTY: '' })
  })
})
