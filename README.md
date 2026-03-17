<div align="center">

# 🏰 env-castle

**Bulletproof environment variable validation for Node.js & TypeScript.**

Validate, type, and protect your env vars at boot time — before your app crashes in production.

[![npm version](https://img.shields.io/npm/v/env-castle.svg)](https://www.npmjs.com/package/env-castle)
[![npm downloads](https://img.shields.io/npm/dm/env-castle.svg)](https://www.npmjs.com/package/env-castle)
[![license](https://img.shields.io/npm/l/env-castle.svg)](https://github.com/wallacefrota/env-castle/blob/main/LICENSE)

✅ Zero dependencies • ✅ Perfect TypeScript inference • ✅ Beautiful errors • ✅ All errors at once • ✅ Built-in `.env` loader

</div>

---

# 🤔 Why?

Every Node.js app uses environment variables. But without validation:

```ts
// 💀 Your app in production at 3am
const port = process.env.PORT; // undefined → crash
const debug = process.env.DEBUG; // "true" → still a string, not boolean
const timeout = process.env.TIMEOUT; // "30s" → can't use as number
const origins = process.env.ORIGINS; // "a.com,b.com" → just a string, not array
const dbUrl = process.env.DATABASE_URL; // typo in .env → silent undefined → crash later
```

env-castle fixes all of this in one line:

```ts
import { env } from "env-castle";

const config = env({
  PORT: { type: "port", default: 3000 },
  DEBUG: { type: "boolean", default: false },
  TIMEOUT: { type: "duration", default: "30s" },
  ORIGINS: { type: "list", default: ["localhost"] },
  DATABASE_URL: { type: "url", required: true },
});

config.PORT; // number
config.DEBUG; // boolean
config.TIMEOUT; // 30000 (ms)
config.ORIGINS; // ['localhost']
config.DATABASE_URL; // string (validated URL)
```

If anything is wrong, you see this at boot time:

```
╔══════════════════════════════════════════════════════╗
║ ❌ ENV VALIDATION FAILED                             ║
╠══════════════════════════════════════════════════════╣
║ DATABASE_URL → missing (required)                    ║
║ ℹ PostgreSQL connection string                      ║
║ PORT → "abc" is not a valid port (0-65535)          ║
║ API_TIMEOUT → "never" is not a valid duration       ║
╠══════════════════════════════════════════════════════╣
║ 3 errors found. Fix your environment variables.     ║
╚══════════════════════════════════════════════════════╝
```

---

# 📦 Install

```bash
# npm
npm install env-castle

# pnpm
pnpm add env-castle

# yarn
yarn add env-castle

# bun
bun add env-castle
```

---

# 🚀 Quick Start

## Basic Usage

```ts
import { env } from "env-castle";

const config = env({
  NODE_ENV: {
    type: "enum",
    values: ["development", "staging", "production"] as const,
    default: "development",
  },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: {
    type: "url",
    required: true,
    desc: "Get it from your database provider dashboard",
  },
  DEBUG: { type: "boolean", default: false },
});

config.NODE_ENV;
config.PORT;
config.DATABASE_URL;
config.DEBUG;
```

---

# With `.env` File

```ts
const config = env(
  {
    PORT: { type: "port", default: 3000 },
  },
  {
    path: ".env",
  },
);
```

Multiple files:

```ts
const config = env(
  {
    PORT: { type: "port", default: 3000 },
  },
  {
    path: [".env", ".env.local", `.env.${process.env.NODE_ENV}`],
    override: true,
  },
);
```

---

# Grouped Variables (Prefix)

```ts
import { envGroup } from "env-castle";

// Reads: DB_HOST, DB_PORT, DB_NAME, DB_PASSWORD, DB_SSL
const db = envGroup("DB_", {
  HOST: { type: "host", default: "localhost" },
  PORT: { type: "port", default: 5432 },
  NAME: { type: "string", required: true },
  PASSWORD: { type: "string", required: true },
  SSL: { type: "boolean", default: true },
});

// Returns clean keys without prefix
db.HOST; // 'localhost'
db.PORT; // 5432
db.NAME; // string
db.PASSWORD; // string
db.SSL; // true

// Combine multiple groups for different services
const redis = envGroup("REDIS_", {
  URL: { type: "url", required: true },
  TTL: { type: "duration", default: "5m" },
});

const aws = envGroup("AWS_", {
  ACCESS_KEY: { type: "string", required: true },
  SECRET_KEY: { type: "string", required: true },
  REGION: {
    type: "enum",
    values: ["us-east-1", "us-west-2", "eu-west-1"] as const,
    default: "us-east-1",
  },
  BUCKET: { type: "string", required: true },
});
```

---

# Single Variable

```ts
import { envVar } from "env-castle";

const port = envVar("PORT", { type: "port", default: 3000 });
// port = 3000

const secret = envVar("JWT_SECRET", {
  type: "string",
  required: true,
  minLength: 32,
});
// secret = string (or throws)
```

---

# Safe Mode (No process.exit)

```ts
import { envSafe, EnvValidationError } from "env-castle";

try {
  const config = envSafe(
    {
      SECRET: { type: "string", required: true },
    },
    { source: {} },
  );
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.log(err.errors);
    // [{ key: 'SECRET', message: 'missing (required)', rule: { ... } }]
  }
}
```

---

# Custom Source (Testing)

```ts
import { envSafe } from "env-castle";

const config = envSafe(
  {
    PORT: { type: "port", default: 3000 },
    DEBUG: { type: "boolean", default: false },
  },
  {
    source: {
      PORT: "8080",
      DEBUG: "true",
    },
  },
);

config.PORT; // 8080
config.DEBUG; // true
```

---

# 📖 Supported Types

## string

Basic string with optional constraints.

```ts
{
  APP_NAME: { type: 'string', default: 'my-app' },
  API_KEY:  { type: 'string', required: true, minLength: 10 },
  LABEL:    { type: 'string', required: true, maxLength: 50 },
  CODE:     { type: 'string', required: true, pattern: /^[A-Z]{3}-\d{4}$/ },
}
// → string
```

| Option    | Type   | Description           |
| --------- | ------ | --------------------- |
| minLength | number | Minimum string length |
| maxLength | number | Maximum string length |
| pattern   | RegExp | Must match pattern    |

---

## number / integer / float

Numeric values with optional range validation.

```ts
{
  WORKERS:     { type: 'integer', default: 4, min: 1, max: 32 },
  RATE:        { type: 'float', required: true, min: 0, max: 1 },
  TIMEOUT_MS:  { type: 'number', default: 5000 },
}
// → number
```

| Option | Type   | Description   |
| ------ | ------ | ------------- |
| min    | number | Minimum value |
| max    | number | Maximum value |

---

Difference between types:

- number — accepts any number (42, 3.14)
- integer — rejects decimals (42 ✅, 3.14 ❌)
- float — same as number, semantic alias

## boolean

Accepts multiple formats (case-insensitive):

Truthy / Falsy values supported:

| Truthy | Falsy |
| ------ | ----- |
| true   | false |
| 1      | 0     |
| yes    | no    |
| on     | off   |

```ts
{
  DEBUG:   { type: 'boolean', default: false },
  VERBOSE: { type: 'boolean', default: false },
}
// → boolean
```

---

## port

Validates port range 0-65535 and coerces to number.

```ts
{
  PORT:       { type: 'port', default: 3000 },
  HTTPS_PORT: { type: 'port', default: 443 },
}

// "3000" → 3000
// "99999" → ❌ error
// → number
```

---

## url

Validates URL format with optional protocol restriction.

```ts
{
  API_URL:      { type: 'url', required: true },
  DATABASE_URL: { type: 'url', required: true, protocols: ['postgres', 'postgresql'] },
}
// → string (validated URL)
```

| Option    | Type     | Description                         |
| --------- | -------- | ----------------------------------- |
| protocols | string[] | Allowed protocols (e.g., ['https']) |

---

## email

Validates email format. Automatically lowercased and trimmed.

```ts
{
  ADMIN_EMAIL:   { type: 'email', required: true },
  SUPPORT_EMAIL: { type: 'email', default: 'support@example.com' },
}
// "Admin@Example.COM" → "admin@example.com"
// → string
```

---

## host

Validates hostname or IP address.

```ts
{
  DB_HOST:    { type: 'host', default: 'localhost' },
  CACHE_HOST: { type: 'host', required: true },
}
// "localhost" ✅
// "api.example.com" ✅
// "192.168.1.1" ✅
// "not a host!" ❌
// → string
```

---

## enum

Type-safe enum values with literal type inference.

```ts
{
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'staging', 'production'] as const, // ← use "as const"!
    default: 'development',
  },
  LOG_LEVEL: {
    type: 'enum',
    values: ['debug', 'info', 'warn', 'error'] as const,
    default: 'info',
  },
}
// → 'development' | 'staging' | 'production'
// → 'debug' | 'info' | 'warn' | 'error'
```

## 💡 Tip: Always use as const on the values array to get literal type inference.

## list

Splits strings into typed arrays.

```ts
{
  ALLOWED_ORIGINS: { type: 'list', default: ['http://localhost:3000'] },
  CORS_METHODS:    { type: 'list', separator: '|', default: ['GET', 'POST'] },
  PORT_LIST:       { type: 'list', itemType: 'number', required: true },
}
// "a.com, b.com, c.com" → ['a.com', 'b.com', 'c.com']
// "GET|POST|PUT"        → ['GET', 'POST', 'PUT']
// "3000,3001,3002"      → [3000, 3001, 3002]
```

| Option    | Type                                  | Description               |
| --------- | ------------------------------------- | ------------------------- |
| separator | string / Split character (default: ,) |
| itemType  | 'string' / 'number'                   | Coerce items to this type |

---

## duration

Parses human-readable durations to milliseconds. Perfect for timeouts, TTLs, intervals.

```ts
{
  API_TIMEOUT:     { type: 'duration', default: '30s' },
  CACHE_TTL:       { type: 'duration', default: '5m' },
  SESSION_EXPIRES: { type: 'duration', default: '7d', min: '1h', max: '30d' },
}
// → number (milliseconds)
```

| Input | Output    | Unit         |
| ----- | --------- | ------------ |
| 100ms | 100       | milliseconds |
| 30s   | 30000     | seconds      |
| 5m    | 300000    | minutes      |
| 2h    | 7200000   | hours        |
| 1d    | 86400000  | days         |
| 1w    | 604800000 | weeks        |

| Option | Type            | Description                   |
| ------ | --------------- | ----------------------------- |
| min    | string / number | Minimum duration (e.g., '1s') |
| max    | string / number | Maximum duration (e.g., '1h') |

---

## json

Parses JSON strings into objects/arrays.

```ts
{
  FEATURE_FLAGS: { type: 'json', default: {} },
  SETTINGS:      { type: 'json', required: true },
}
// '{"darkMode":true,"beta":false}' → { darkMode: true, beta: false }
// → any
```

---

## ip

Validates IPv4 or IPv6 addresses.

```ts
{
  BIND_ADDRESS: { type: 'ip', default: '0.0.0.0' },
  SERVER_IP:    { type: 'ip', version: 4, required: true },
  IPV6_ADDR:    { type: 'ip', version: 6, required: true },
}
// → string
```

| Option  | Type  | Description                     |
| ------- | ----- | ------------------------------- |
| version | 4 / 6 | Restrict to specific IP version |

---

## path

Validates file system paths with optional existence check.

```ts
{
  LOG_DIR:    { type: 'path', default: './logs' },
  CERT_FILE:  { type: 'path', required: true, mustExist: true },
  UPLOAD_DIR: { type: 'path', default: '/tmp/uploads' },
}
// → string
```

| Option    | Type    | Description                        |
| --------- | ------- | ---------------------------------- |
| mustExist | boolean | Check if path exists on filesystem |

---

## regex

Validates against a custom regular expression pattern.

```ts
{
  APP_VERSION: { type: 'regex', required: true, pattern: /^\d+\.\d+\.\d+$/ },
  HEX_COLOR:  { type: 'regex', default: '#000000', pattern: /^#[0-9a-fA-F]{6}$/ },
  SLUG:       { type: 'regex', required: true, pattern: /^[a-z0-9-]+$/ },
}
// → string
```

| Option  | Type   | Description                       |
| ------- | ------ | --------------------------------- |
| pattern | RegExp | Required. Must match this pattern |

---

📋 All Types at a Glance

| Type     | Coerces to | Example Input | Example Output | Extra Options                 |
| -------- | ---------- | ------------- | -------------- | ----------------------------- |
| string   | string     | "hello"       | "hello"        | minLength, maxLength, pattern |
| number   | number     | "3.14"        | 3.14           | min, max                      |
| integer  | number     | "42"          | 42             | min, max                      |
| float    | number     | "3.14"        | 3.14           | min, max                      |
| boolean  | boolean    | "true"        | true           | —                             |
| port     | number     | "3000"        | 3000           | —                             |
| url      | string     | "https://..." | "https://..."  | protocols                     |
| email    | string     | "A@B.COM"     | "a@b.com"      | —                             |
| host     | string     | "localhost"   | "localhost"    | —                             |
| json     | any        | '{"a":1}'     | { a: 1 }       | —                             |
| list     | string[]   | "a,b,c"       | ['a','b','c']  | separator, itemType           |
| enum     | literal    | "prod"        | "prod"         | values                        |
| duration | number     | "30s"         | 30000          | min, max                      |
| ip       | string     | "1.2.3.4"     | "1.2.3.4"      | version                       |
| path     | string     | "./logs"      | "./logs"       | mustExist                     |
| regex    | string     | "ABC-123"     | "ABC-123"      | pattern                       |

# ⚙️ Options

All options for env() / envSafe():

```ts
env(schema, {
  // Path to .env file(s)
  path: ".env",
  // path: ['.env', '.env.local'],

  // Override process.env with .env file values (default: false)
  override: false,

  // Custom env source — useful for testing
  source: { PORT: "3000", DEBUG: "true" },

  // Only read vars with this prefix
  prefix: "APP_",

  // Remove prefix from result keys (default: false)
  stripPrefix: false,

  // Call process.exit(1) on error (default: true)
  // Use envSafe() for exitOnError: false
  exitOnError: true,
});
```

---

# ✨ Features

## 🎯 All Errors at Once

Shows every problem instead of failing on the first one.

## 🔒 Immutable Config

```ts
const config = env({ PORT: { type: "port", default: 3000 } });

config.PORT = 9999; // ❌ TypeError: Cannot assign to read only property
```

## 🔐 Sensitive Value Masking

```
API_SECRET_KEY → "sk****yz"
DB_PASSWORD → "my****rd"
```

## 📝 Descriptions

Add desc to help teammates understand where to find values:

```ts
const config = env({
  STRIPE_KEY: {
    type: "string",
    required: true,
    desc: "Get it from https://dashboard.stripe.com/apikeys",
  },
  SENDGRID_KEY: {
    type: "string",
    required: true,
    desc: "Settings → API Keys in SendGrid dashboard",
  },
});
```

---

# 🔤 TypeScript Inference

Full type inference without manual type definitions:

```ts
const config = env({
  PORT: { type: "port", default: 3000 },
  DEBUG: { type: "boolean", default: false },
  NODE_ENV: { type: "enum", values: ["dev", "prod"] as const, default: "dev" },
  TAGS: { type: "list", default: [] },
  TIMEOUT: { type: "duration", default: "30s" },
  METADATA: { type: "json", default: {} },
});

// TypeScript knows:
// config.PORT     → number
// config.DEBUG    → boolean
// config.NODE_ENV → 'dev' | 'prod'
// config.TAGS     → string[]
// config.TIMEOUT  → number
// config.METADATA → any
```

---

# 📦 Built-in `.env` Parser

No need for dotenv. Built-in parser supports:

Supports:

- Comments
- Quoted values
- export prefix
- inline comments
- multiline values
- empty values

Example:

```bash
# ✅ Comments
SIMPLE=value

# ✅ Quoted values (single, double, backtick)
DOUBLE="hello world"
SINGLE='hello world'
BACKTICK=`hello world`

# ✅ export prefix
export EXPORTED=yes

# ✅ Inline comments
INLINE=value # this is ignored

# ✅ Values with special characters
URL=postgres://user:pass@host:5432/db?ssl=true

# ✅ Multiline (double quotes)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"

# ✅ Empty values
EMPTY=
```

---

# 🏗️ Real-World Examples

## Express / Fastify API

```ts
// src/config.ts
import { env, envGroup } from "env-castle";

export const config = env(
  {
    NODE_ENV: {
      type: "enum",
      values: ["development", "production", "test"] as const,
      default: "development",
    },
    PORT: { type: "port", default: 3000 },
    LOG_LEVEL: {
      type: "enum",
      values: ["debug", "info", "warn", "error"] as const,
      default: "info",
    },
    CORS_ORIGINS: { type: "list", default: ["http://localhost:3000"] },
    REQUEST_TIMEOUT: { type: "duration", default: "30s" },
  },
  { path: ".env" },
);

export const db = envGroup("DB_", {
  HOST: { type: "host", default: "localhost" },
  PORT: { type: "port", default: 5432 },
  NAME: { type: "string", required: true },
  USER: { type: "string", required: true },
  PASSWORD: { type: "string", required: true },
  SSL: { type: "boolean", default: false },
  POOL_SIZE: { type: "integer", default: 10, min: 1, max: 100 },
});

export const jwt = envGroup("JWT_", {
  SECRET: {
    type: "string",
    required: true,
    minLength: 32,
    desc: "Min 32 chars. Generate with: openssl rand -hex 32",
  },
  EXPIRES_IN: { type: "duration", default: "7d" },
  REFRESH_TTL: { type: "duration", default: "30d" },
});

// src/app.ts
import express from "express";
import cors from "cors";
import { config, db, jwt } from "./config";

const app = express();

app.use(cors({ origin: config.CORS_ORIGINS }));

app.listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📦 Environment: ${config.NODE_ENV}`);
  console.log(`🗄️  Database: ${db.HOST}:${db.PORT}/${db.NAME}`);
  console.log(`🔑 JWT expires in: ${jwt.EXPIRES_IN}ms`);
});
```

## Microservice with External APIs

```ts
// src/config.ts
import { env, envGroup } from "env-castle";

const config = env(
  {
    SERVICE_NAME: { type: "string", default: "payment-service" },
    PORT: { type: "port", default: 3000 },
    NODE_ENV: {
      type: "enum",
      values: ["development", "staging", "production"] as const,
      default: "development",
    },
    REQUEST_TIMEOUT: { type: "duration", default: "10s", min: "1s", max: "2m" },
    MAX_RETRIES: { type: "integer", default: 3, min: 0, max: 10 },
    ALLOWED_IPS: { type: "list", default: [] },
    FEATURE_FLAGS: { type: "json", default: {} },
  },
  {
    path: [".env", ".env.local"],
  },
);

const stripe = envGroup("STRIPE_", {
  SECRET_KEY: {
    type: "string",
    required: true,
    minLength: 20,
    desc: "https://dashboard.stripe.com/apikeys",
  },
  WEBHOOK_SECRET: {
    type: "string",
    required: true,
    desc: "https://dashboard.stripe.com/webhooks",
  },
  API_VERSION: {
    type: "regex",
    default: "2024-01-01",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
  },
});

const redis = envGroup("REDIS_", {
  URL: { type: "url", required: true, protocols: ["redis", "rediss"] },
  TTL: { type: "duration", default: "5m" },
});

const email = envGroup("SMTP_", {
  HOST: { type: "host", required: true },
  PORT: { type: "port", default: 587 },
  USER: { type: "email", required: true },
  PASS: { type: "string", required: true },
  FROM: { type: "email", required: true },
});

export { config, stripe, redis, email };
```

---

# 📊 Comparison

| Feature              | dotenv | env-var | t3-env | env-castle |
| -------------------- | ------ | ------- | ------ | ---------- |
| Loads .env           | ✅     | ❌      | ❌     | ✅         |
| Type validation      | ❌     | ✅      | ✅     | ✅         |
| All errors at once   | ❌     | ❌      | ❌     | ✅         |
| TypeScript inference | ❌     | ⚠️      | ✅     | ✅         |
| Beautiful errors     | ❌     | ❌      | ❌     | ✅         |
| Duration parsing     | ❌     | ❌      | ❌     | ✅         |
| List parsing         | ❌     | ❌      | ❌     | ✅         |
| Prefix groups        | ❌     | ❌      | ✅     | ✅         |
| Enum literal types   | ❌     | ❌      | ✅     | ✅         |
| Immutable config     | ❌     | ❌      | ❌     | ✅         |
| Zero dependencies    | ✅     | ✅      | ❌     | ✅         |

---

# 📚 API Reference

## env(schema, options?)

Validates process.env against schema. Exits process on failure (production-safe).

```ts
const config = env({
  PORT: { type: "port", default: 3000 },
});
```

Returns: Frozen, fully-typed config object.

---

## envSafe(schema, options?)

Same as env() but throws EnvValidationError instead of calling process.exit.

```ts
const config = envSafe({
  PORT: { type: "port", default: 3000 },
});
```

Returns: Frozen, fully-typed config object.
Throws: `EnvValidationError` instead of exiting.

---

## envGroup(prefix, schema)

Reads prefixed variables and returns clean keys without the prefix.

```ts
const db = envGroup("DB_", {
  HOST: { type: "host", default: "localhost" },
  PORT: { type: "port", default: 5432 },
});

// Reads DB_HOST, DB_PORT
// Returns { HOST: '...', PORT: 5432 }
```

Returns: Frozen, fully-typed config object.

---

## envVar(key, rule)

Validates a single environment variable.

```ts
const port = envVar("PORT", { type: "port", default: 3000 });
```

Returns: Coerced value.
Throws: EnvValidationError

---

# EnvValidationError

Error class thrown when validation fails.

```ts
import { EnvValidationError } from 'env-castle'

try {
  envSafe({ ... }, { source: {} })
} catch (err) {
  if (err instanceof EnvValidationError) {
    err.errors
    // Array of:
    // {
    //   key: string       — variable name
    //   message: string   — what went wrong
    //   value?: string    — the invalid value (masked if sensitive)
    //   rule: Rule        — the schema rule that failed
    // }
  }
}
```

---

# 🤝 Contributing

```bash
# Clone
git clone https://github.com/wallacefrota/env-castle.git
cd env-castle

# Install
npm install

# Run tests
npm run test

# Build
npm run build
```

---

# 📄 License

Published under the [MIT](https://github.com/wallacefrota/env-castle/blob/main/LICENSE) license. Made by [Wallace Frota](https://github.com/wallacefrota)

---
