import { describe, it, expect } from 'vitest'
import { envSafe, envGroup, envVar, EnvValidationError } from '../index'

describe('env-castle', () => {

  describe('basic types', () => {
    it('validates string', () => {
      const config = envSafe({
        NAME: { type: 'string', required: true }
      }, { source: { NAME: 'John' } })

      expect(config.NAME).toBe('John')
    })

    it('validates number', () => {
      const config = envSafe({
        COUNT: { type: 'number', required: true }
      }, { source: { COUNT: '42' } })

      expect(config.COUNT).toBe(42)
    })

    it('validates integer', () => {
      const config = envSafe({
        COUNT: { type: 'integer', required: true }
      }, { source: { COUNT: '42' } })

      expect(config.COUNT).toBe(42)
    })

    it('rejects float as integer', () => {
      expect(() => envSafe({
        COUNT: { type: 'integer', required: true }
      }, { source: { COUNT: '4.2' } })).toThrow(EnvValidationError)
    })

    it('validates float', () => {
      const config = envSafe({
        RATE: { type: 'float', required: true }
      }, { source: { RATE: '3.14' } })

      expect(Math.round(config.RATE * 100)).toBe(314)
    })

    it('validates boolean - true values', () => {
      const trueValues = ['true', '1', 'yes', 'on', 'TRUE', 'Yes']

      for (const val of trueValues) {
        const config = envSafe({
          FLAG: { type: 'boolean', required: true }
        }, { source: { FLAG: val } })

        expect(config.FLAG).toBe(true);
      }
    })

    it('validates boolean - false values', () => {
      const falseValues = ['false', '0', 'no', 'off', 'FALSE', 'No']

      for (const val of falseValues) {
        const config = envSafe({
          FLAG: { type: 'boolean', required: true }
        }, { source: { FLAG: val } })
        expect(config.FLAG).toBe(false)
      }
    })

    it('rejects invalid boolean', () => {
      expect(() => envSafe({
        FLAG: { type: 'boolean', required: true }
      }, { source: { FLAG: 'maybe' } })).toThrow(EnvValidationError)
    })

    it('validates port', () => {
      const config = envSafe({
        PORT: { type: 'port', required: true }
      }, { source: { PORT: '3000' } })

      expect(config.PORT).toBe(3000)
    })

    it('rejects invalid port', () => {
      expect(() => envSafe({
        PORT: { type: 'port', required: true }
      }, { source: { PORT: '99999' } })).toThrow(EnvValidationError)
    })

    it('validates url', () => {
      const config = envSafe({
        API: { type: 'url', required: true }
      }, { source: { API: 'https://api.example.com/v1' } })

      expect(config.API).toBe('https://api.example.com/v1')
    })

    it('rejects url with wrong protocol', () => {
      expect(() => envSafe({
        API: { type: 'url', required: true, protocols: ['https'] }
      }, { source: { API: 'http://insecure.com' } })).toThrow(EnvValidationError)
    })

    it('validates email and lowercases it', () => {
      const config = envSafe({
        ADMIN: { type: 'email', required: true }
      }, { source: { ADMIN: 'Admin@Example.COM' } })

      expect(config.ADMIN).toBe('admin@example.com')
    })

    it('validates json', () => {
      const config = envSafe({
        DATA: { type: 'json', required: true }
      }, { source: { DATA: '{"a":1,"b":[2,3]}' } })

      expect(config.DATA).toEqual({ a: 1, b: [2, 3] })
    })

    it('validates list', () => {
      const config = envSafe({
        ORIGINS: { type: 'list', required: true }
      }, { source: { ORIGINS: 'a.com, b.com, c.com' } })

      expect(config.ORIGINS).toEqual(['a.com', 'b.com', 'c.com'])
    })

    it('validates list with custom separator', () => {
      const config = envSafe({
        ITEMS: { type: 'list', required: true, separator: '|' }
      }, { source: { ITEMS: 'one|two|three' } })

      expect(config.ITEMS).toEqual(['one', 'two', 'three'])
    })

    it('validates numeric list', () => {
      const config = envSafe({
        IDS: { type: 'list', required: true, itemType: 'number' }
      }, { source: { IDS: '1,2,3' } })

      expect(config.IDS).toEqual([1, 2, 3])
    })

    it('validates enum', () => {
      const config = envSafe({
        ENV: { type: 'enum', values: ['dev', 'staging', 'prod'] as const, required: true }
      }, { source: { ENV: 'prod' } })

      expect(config.ENV, 'prod')
    })

    it('rejects invalid enum', () => {
      expect(() => envSafe({
        ENV: { type: 'enum', values: ['dev', 'staging', 'prod'] as const, required: true }
      }, { source: { ENV: 'test' } })).toThrow(EnvValidationError)
    })

    it('validates duration', () => {
      const config = envSafe({
        TIMEOUT: { type: 'duration', required: true }
      }, { source: { TIMEOUT: '30s' } })

      expect(config.TIMEOUT).toBe(30000)
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

        expect(config.T).toBe(expected)
      }
    })

    it('rejects duration out of range', () => {
      expect(() => envSafe({
        TIMEOUT: { type: 'duration', required: true, min: '1m', max: '1h' }
      }, { source: { TIMEOUT: '5s' } })).toThrow(EnvValidationError)
    })

    it('validates IPv4', () => {
      const config = envSafe({
        HOST: { type: 'ip', version: 4, required: true }
      }, { source: { HOST: '192.168.1.1' } })

      expect(config.HOST).toBe('192.168.1.1')
    })

    it('validates path', () => {
      const config = envSafe({
        LOG_DIR: { type: 'path', required: true }
      }, { source: { LOG_DIR: '/var/log' } })

      expect(config.LOG_DIR).toBe('/var/log')
    })

    it('validates regex pattern', () => {
      const config = envSafe({
        CODE: { type: 'regex', required: true, pattern: /^[A-Z]{3}-\d{3}$/ }
      }, { source: { CODE: 'ABC-123' } })

      expect(config.CODE).toBe('ABC-123')
    })
  })

  describe('defaults', () => {
    it('uses default when var is missing', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 },
        DEBUG: { type: 'boolean', default: false },
      }, { source: {} })

      expect(config.PORT).toBe(3000)
      expect(config.DEBUG).toBe(false)
    })

    it('prefers provided value over default', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 },
      }, { source: { PORT: '8080' } })

      expect(config.PORT).toBe(8080)
    })

    it('converts default duration to ms', () => {
      const config = envSafe({
        TIMEOUT: { type: 'duration', default: '30s' },
      }, { source: {} })

      expect(config.TIMEOUT).toBe(30000)
    })
  })

  describe('required', () => {
    it('fails on missing required var', () => {
      expect(() => envSafe({
        SECRET: { type: 'string', required: true }
      }, { source: {} })).toThrow(EnvValidationError)
    })

    it('collects ALL errors at once', () => {
      try {
        envSafe({
          A: { type: 'string', required: true },
          B: { type: 'number', required: true },
          C: { type: 'url', required: true },
        }, { source: {} })

        throw new Error('Should have thrown')
      } catch (err: any) {
        expect(err).toBeInstanceOf(EnvValidationError)
        expect(err.errors.length).toBe(3)
      }
    })
  })

  describe('number constraints', () => {
    it('validates min', () => {
      expect(() => envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '0' } })).toThrow(EnvValidationError)
    })

    it('validates max', () => {
      expect(() => envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '32' } })).toThrow(EnvValidationError)
    })

    it('passes valid range', () => {
      const config = envSafe({
        WORKERS: { type: 'integer', required: true, min: 1, max: 16 }
      }, { source: { WORKERS: '4' } })

      expect(config.WORKERS).toBe(4)
    })
  })

  describe('string constraints', () => {
    it('validates minLength', () => {
      expect(() => envSafe({
        TOKEN: { type: 'string', required: true, minLength: 10 }
      }, { source: { TOKEN: 'abc' } })).toThrow(EnvValidationError)
    })

    it('validates pattern', () => {
      const config = envSafe({
        CODE: { type: 'string', required: true, pattern: /^[A-Z]{3}-\d{3}$/ }
      }, { source: { CODE: 'ABC-123' } })

      expect(config.CODE).toBe('ABC-123')
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

      expect(config.HOST).toBe('prod-db.example.com')
      expect(config.PORT).toBe(5433)
      expect(config.NAME).toBe('myapp')
    })
  })

  describe('envVar (single)', () => {
    it('validates and returns value', () => {
      const port = envVar('PORT', { type: 'port', default: 3000 }, { PORT: '8080' })

      expect(port).toBe(8080)
    })

    it('uses default', () => {
      const port = envVar('PORT', { type: 'port', default: 3000 }, {})

      expect(port).toBe(3000)
    })

    it('throws on missing required', () => {
      expect(() =>
        envVar('PORT', { type: 'port', required: true }, {}),
      ).toThrow(EnvValidationError)
    })
  })

  describe('immutability', () => {
    it('returns frozen object', () => {
      const config = envSafe({
        PORT: { type: 'port', default: 3000 }
      }, { source: {} })

      expect(() => {
        (config as any).PORT = 9999
      }).toThrow()
    })
  })
})
