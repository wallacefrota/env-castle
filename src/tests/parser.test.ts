import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseEnvContent } from '../parser'

describe('parseEnvContent', () => {

  it('parses key=value', () => {
    const result = parseEnvContent('FOO=bar\nBAZ=qux')
    assert.deepEqual(result, { FOO: 'bar', BAZ: 'qux' })
  })

  it('handles double quotes', () => {
    const result = parseEnvContent('MSG="hello world"')
    assert.deepEqual(result, { MSG: 'hello world' })
  })

  it('handles single quotes', () => {
    const result = parseEnvContent("MSG='hello world'")
    assert.deepEqual(result, { MSG: 'hello world' })
  })

  it('ignores comments', () => {
    const result = parseEnvContent('# comment\nFOO=bar')
    assert.deepEqual(result, { FOO: 'bar' })
  })

  it('handles inline comments', () => {
    const result = parseEnvContent('FOO=bar # comment')
    assert.deepEqual(result, { FOO: 'bar' })
  })

  it('handles empty lines', () => {
    const result = parseEnvContent('\nFOO=bar\n\nBAZ=qux\n')
    assert.deepEqual(result, { FOO: 'bar', BAZ: 'qux' })
  })

  it('handles export prefix', () => {
    const result = parseEnvContent('export FOO=bar')
    assert.deepEqual(result, { FOO: 'bar' })
  })

  it('handles values with equals', () => {
    const result = parseEnvContent('URL=postgres://host:5432/db?ssl=true')
    assert.equal(result.URL, 'postgres://host:5432/db?ssl=true')
  })

  it('handles empty values', () => {
    const result = parseEnvContent('EMPTY=')
    assert.deepEqual(result, { EMPTY: '' })
  })
})