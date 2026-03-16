import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { envSafe, envGroup, envVar, EnvValidationError } from '../index'

describe('env-castle', () => {

  describe('basic types', () => {
    it('validates string', () => {
      const config = envSafe({
        NAME: { type: 'string', required: true }
      }, { source: { NAME: 'John' } })

      assert.equal(config.NAME, 'John')
    })

    it('validates number', () => {
      const config = envSafe({
        COUNT: { type: 'number', required: true }
      }, { source: { COUNT: '42' } })

      assert.equal(config.COUNT, 42)
    })

    it('validates integer', () => {
      const config = envSafe({
        COUNT: { type: 'integer', required: true }
      }, { source: { COUNT: '42' } })

      assert.equal(config.COUNT, 42)
    })

    it('rejects float as integer', () => {
      assert.throws(() => envSafe({
        COUNT: { type: 'integer', required: true }
      }, { source: { COUNT: '4.2' } }), EnvValidationError)
    })

    it('validates float', () => {
      const config = envSafe({
        RATE: { type: 'float', required: true }
      }, { source: { RATE: '3.14' } })

      assert.equal(Math.round(config.RATE * 100), 314)
    })

    it('validates boolean - true values', () => {
      const trueValues = ['true', '1', 'yes', 'on', 'TRUE', 'Yes']

      for (const val of trueValues) {
        const config = envSafe({
          FLAG: { type: 'boolean', required: true }
        }, { source: { FLAG: val } })
        assert.equal(config.FLAG, true, `"${val}" should be true`)
      }
    })

    it('validates boolean - false values', () => {
      const falseValues = ['false', '0', 'no', 'off', 'FALSE', 'No']

      for (const val of falseValues) {
        const config = envSafe({
          FLAG: { type: 'boolean', required: true }
        }, { source: { FLAG: val } })
        assert.equal(config.FLAG, false, `"${val}" should be false`)
      }
    })

    it('rejects invalid boolean', () => {
      assert.throws(() => envSafe({
        FLAG: { type: 'boolean', required: true }
      }, { source: { FLAG: 'maybe' } }), EnvValidationError)
    })

    it('validates port', () => {
      const config = envSafe({
        PORT: { type: 'port', required: true }
      }, { source: { PORT: '3000' } })

      assert.equal(config.PORT, 3000)
    })

    it('rejects invalid port', () => {
      assert.throws(() => envSafe({
        PORT: { type: 'port', required: true }
      }, { source: { PORT: '99999' } }), EnvValidationError)
    })

    it('validates url', () => {
      const config = envSafe({
        API: { type: 'url', required: true }
      }, { source: { API: 'https://api.example.com/v1' } })

      assert.equal(config.API, 'https://api.example.com/v1')
    })

    it('rejects url with wrong protocol', () => {
      assert.throws(() => envSafe({
        API: { type: 'url', required: true, protocols: ['https'] }
      }, { source: { API: 'http://insecure.com' } }), EnvValidationError)
    })

    it('validates email and lowercases it', () => {
      const config = envSafe({
        ADMIN: { type: 'email', required: true }
      }, { source: { ADMIN: 'Admin@Example.COM' } })

      assert.equal(config.ADMIN, 'admin@example.com')
    })

    it('validates json', () => {
      const config = envSafe({
        DATA: { type: 'json', required: true }
      }, { source: { DATA: '{"a":1,"b":[2,3]}' } })

      assert.deepEqual(config.DATA, { a: 1, b: [2, 3] })
    })

    it('validates list', () => {
      const config = envSafe({
        ORIGINS: { type: 'list', required: true }
      }, { source: { ORIGINS: 'a.com, b.com, c.com' } })

      assert.deepEqual(config.ORIGINS, ['a.com', 'b.com', 'c.com'])
    })

    it('validates list with custom separator', () => {
      const config = envSafe({
        ITEMS: { type: 'list', required: true, separator: '|' }
      }, { source: { ITEMS: 'one|two|three' } })

      assert.deepEqual(config.ITEMS, ['one', 'two', 'three'])
    })

    it('validates numeric list', () => {
      const config = envSafe({
        IDS: { type: 'list', required: true, itemType: 'number' }
      }, { source: { IDS: '1,2,3' } })

      assert.deepEqual(config.IDS, [1, 2, 3])
    })

    it('validates enum', () => {
      const config = envSafe({
        ENV: { type: 'enum', values: ['dev', 'staging', 'prod'] as const, required: true }
      }, { source: { ENV: 'prod' } })

      assert.equal(config.ENV, 'prod')
    })

    it('rejects invalid enum', () => {
      assert.throws(() => envSafe({
        ENV: { type: 'enum', values: ['dev', 'staging', 'prod'] as const, required: true }
      }, { source: { ENV: 'test' } }), EnvValidationError)
    })

    it('validates duration', () => {
      const config = envSafe({
        TIMEOUT: { type: 'duration', required: true }
      }, { source: { TIMEOUT: '30s' } })

      assert.equal(config.TIMEOUT, 30000)
    })

    it('validates all duration units', () => {
      const cases: [string, number][] = [
        ['100ms', 100],
        ['5s', 5000],
        ['2m', 120000],
        ['1h', 3600000],
        ['1d', 86400000],
        ['1w', 604800000],
      ]

      for (const [input, expected] of cases) {
        const config = envSafe({
          T: { type: 'duration', required: true }
        }, { source: { T: input } })
        assert.equal(config.T, expected, `"${input}" should be ${expected}ms`)
      }
    })

    it('rejects duration out of range', () => {
      assert.throws(() => envSafe({
        TIMEOUT: { type: 'duration', required: true, min: '1m', max: '1h' }
      }, { source: { TIMEOUT: '5s' } }), EnvValidationError)
    })

    it('validates IPv4', () => {
      const config = envSafe({
        HOST: { type: 'ip', version: 4, required: true }
      }, { source: { HOST: '192.168.1.1' } })

      assert.equal(config.HOST, '192.168.1.1')
    })

    it('validates path', () => {
      const config = envSafe({
        LOG_DIR: { type: 'path', required: true }
      }, { source: { LOG_DIR: '/var/log' } })

      assert.equal(config.LOG_DIR, '/var/log')
    })

    it('validates regex pattern', () => {
      const config = envSafe({
        CODE: { type: 'regex', required: true, pattern: /^[A-Z]{3}-\d{3}$/ }
      }, { source: { CODE: 'ABC-123' } })

      assert.equal(config.CODE, 'ABC-123')
    })
  })

  describe('defaults', () => {
    it('uses default when var is missing', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 },
        DEBUG: { type: 'boolean', default: false },
      }, { source: {} })

      assert.equal(config.PORT, 3000)
      assert.equal(config.DEBUG, false)
    })

    it('prefers provided value over default', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 },
      }, { source: { PORT: '8080' } })

      assert.equal(config.PORT, 8080)
    })

    it('converts default duration to ms', () => {
      const config = envSafe({
        TIMEOUT: { type: 'duration', default: '30s' },
      }, { source: {} })

      assert.equal(config.TIMEOUT, 30000)
    })
  })

  describe('required', () => {
    it('fails on missing required var', () => {
      assert.throws(() => envSafe({
        SECRET: { type: 'string', required: true }
      }, { source: {} }), EnvValidationError)
    })

    it('collects ALL errors at once', () => {
      try {
        envSafe({
          A: { type: 'string', required: true },
          B: { type: 'number', required: true },
          C: { type: 'url', required: true },
        }, { source: {} })
        assert.fail('Should have thrown')
      } catch (err: any) {
        assert.ok(err instanceof EnvValidationError)
        assert.equal(err.errors.length, 3)
      }
    })
  })

  describe('number constraints', () => {
    it('validates min', () => {
      assert.throws(() => envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '0' } }), EnvValidationError)
    })

    it('validates max', () => {
      assert.throws(() => envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '32' } }), EnvValidationError)
    })

    it('passes valid range', () => {
      const config = envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '4' } })

      assert.equal(config.WORKERS, 4)
    })
  })

  describe('string constraints', () => {
    it('validates minLength', () => {
      assert.throws(() => envSafe({
        TOKEN: { type: 'string', required: true, minLength: 10 }
      }, { source: { TOKEN: 'abc' } }), EnvValidationError)
    })

    it('validates pattern', () => {
      const config = envSafe({
        CODE: { type: 'string', required: true, pattern: /^[A-Z]{3}-\d{3}$/ }
      }, { source: { CODE: 'ABC-123' } })

      assert.equal(config.CODE, 'ABC-123')
    })
  })

  describe('envGroup', () => {
    it('reads prefixed variables and strips prefix', () => {
      const config = envGroup('DB_', {
        HOST: { type: 'host', default: 'localhost' },
        PORT: { type: 'port', default: 5432 },
        NAME: { type: 'string', required: true },
      }, {
        source: {
          DB_HOST: 'prod-db.example.com',
          DB_PORT: '5433',
          DB_NAME: 'myapp'
        }
      })

      assert.equal(config.HOST, 'prod-db.example.com')
      assert.equal(config.PORT, 5433)
      assert.equal(config.NAME, 'myapp')
    })
  })

  describe('envVar (single)', () => {
    it('validates and returns value', () => {
      const port = envVar('PORT', { type: 'port', default: 3000 }, { PORT: '8080' })
      assert.equal(port, 8080)
    })

    it('uses default', () => {
      const port = envVar('PORT', { type: 'port', default: 3000 }, {})
      assert.equal(port, 3000)
    })

    it('throws on missing required', () => {
      assert.throws(() =>
        envVar('PORT', { type: 'port', required: true }, {}),
        EnvValidationError
      )
    })
  })

  describe('immutability', () => {
    it('returns frozen object', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 }
      }, { source: {} })

      assert.throws(() => { (config as any).PORT = 9999 })
    })
  })
})