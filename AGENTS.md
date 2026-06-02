# Sepomex API

## Purpose

A REST API for importing and looking up Mexican postal codes (Códigos Postales) from the SEPOMEX database. Built with Express.js and Supabase PostgreSQL.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **Package Manager**: pnpm
- **File Upload**: Multer (memory storage)
- **Security**: Helmet, API key auth (per-subscriber), rate limiting, Morgan, Winston

## Project Structure

```
/src
  /controllers    - Request handlers (sepomexController.js)
  /db             - Supabase client config (supabase.js)
  /middlewares    - Auth & validation (auth.js, rateLimiter.js, validateFileExtension.js)
  /routes         - Route definitions (postalCodesRoutes.js, statesRoutes.js)
  /services       - Business logic (sepomexService.js)
  /utils          - Helpers (fileStorage.js, normalize.js, logger.js)
  app.js          - Express app configuration
  server.js       - Server entry point
/scripts          - CLI tools (generate-api-key.js)
/uploads          - Uploaded files directory
```

## API Endpoints

### POST /api/import
- **Purpose**: Import SEPOMEX txt/csv file
- **Auth**: Subscriber API key (`x-api-key` header)
- **Rate Limit**: Per subscriber limits (default: 30/min, 500/day for free tier)
- **Input**: Multipart form with `file` field
- **Validation**: File extension (.txt or .csv), file size limit 50MB
- **Behavior**: Truncates existing data, batch inserts new records (1000 per transaction)
- **Response**: `{ success, filename, originalName, totalRecords }`

### GET /api/postal-codes/:zipcode
- **Purpose**: Get all settlements for a zipcode
- **Auth**: Subscriber API key (`x-api-key` header)
- **Response**: `{ success, data: [{ zipcode, neighborhood, municipality, city, state, state_iso_code }] }`

### GET /api/postal-codes/:zipcode/grouped
- **Purpose**: Get settlements grouped by city/municipality
- **Auth**: Subscriber API key (`x-api-key` header)
- **Response**: `{ success, data: [{ zipcode, city, state, stateIso, municipality, neighborhoods: [...] }] }`

### GET /api/states/:stateIso/cities
- **Purpose**: List all cities in a state
- **Auth**: Subscriber API key (`x-api-key` header)
- **Note**: `stateIso` is case-insensitive (QRO or qro)
- **Response**: `{ success, data: [cityName1, cityName2, ...] }`

### GET /api/states/:stateIso/cities/:normalizedCity/postal-codes
- **Purpose**: Get all postal codes and neighborhoods for a city
- **Auth**: Subscriber API key (`x-api-key` header)
- **Note**: `stateIso` is case-insensitive
- **Response**: `{ success, state, city, postalCodes: [{ zipcode, municipality, neighborhoods: [...] }] }`

### GET /health
- **Purpose**: Health check
- **Auth**: Not required
- **Response**: `{ status: "ok" }`

## Subscriber Authentication

All `/api/*` endpoints require a subscriber API key via `x-api-key` header:

```bash
# Required header
x-api-key: pcx_9b13990167b67a70d4e75a8b751072c10aa05cb2a40adb7e

# Missing API key
{ "success": false, "error": "Missing API key. Include x-api-key header." }

# Invalid API key
{ "success": false, "error": "Invalid API key" }

# Inactive API key
{ "success": false, "error": "API key is inactive. Contact support." }
```

### Rate Limit Headers

Every response includes rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per minute |
| `X-RateLimit-Remaining` | Requests left in current minute |
| `X-DailyLimit-Remaining` | Requests left today |

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded. You can make 30 requests per minute. Retry after 45 seconds."
}
```

## Database Schema

### state_mapping
```sql
CREATE TABLE state_mapping (
  id SERIAL PRIMARY KEY,
  state_name TEXT NOT NULL,
  state_iso_code TEXT NOT NULL UNIQUE
);
-- Index on state_iso_code
```

### sepomex
```sql
CREATE TABLE sepomex (
  id SERIAL PRIMARY KEY,
  zipcode TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  municipality TEXT NOT NULL,
  city TEXT,
  state TEXT NOT NULL,
  state_iso_code TEXT,
  normalized_city TEXT
);
-- Indexes on zipcode, state_iso_code, normalized_city, city, state
```

### subscribers
```sql
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER NOT NULL DEFAULT 30,   -- requests per minute
  daily_limit INTEGER NOT NULL DEFAULT 500, -- requests per day
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Index on api_key
```

### api_usage
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minute_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0
);
-- Unique constraint on (subscriber_id, minute_timestamp)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/db/supabase.js` | Supabase client (anon + admin) |
| `src/services/sepomexService.js` | File parsing, batch insert, all query methods |
| `src/controllers/sepomexController.js` | Request/response handling |
| `src/middlewares/auth.js` | Subscriber API key validation |
| `src/middlewares/rateLimiter.js` | Per-minute and per-day rate limiting |
| `src/routes/postalCodesRoutes.js` | Postal codes routes |
| `src/routes/statesRoutes.js` | States and cities routes |
| `src/utils/normalize.js` | City name normalization function |
| `src/utils/logger.js` | Winston logger for structured error/request logging |
| `scripts/generate-api-key.js` | CLI to generate subscriber API keys |

## Subscriber Tiers

| Tier | Per Minute | Per Day |
|------|------------|---------|
| Free | 30 | 500 |
| Pro | 100 | 2000 |

## Data Flow

1. **Import**: File upload → Memory storage (Multer) → Parse (Latin-1 encoding) → Map state names to ISO codes → Normalize city names → Batch insert (Supabase) → Save to disk
2. **Lookup**: Route param → Service method → Supabase query → Return results (grouped or flat)
3. **Auth**: API key header → Lookup in subscribers table → Attach subscriber to request → Rate limit check

## City Normalization

Used for URL paths in `/states/:stateIso/cities/:normalizedCity/postal-codes`:

```javascript
// Rules:
// - Lowercase
// - Remove accents (é → e, ñ → n)
// - Replace spaces with hyphens
// - Remove special characters

normalizeCity("Santiago de Querétaro") // → "santiago-de-queretaro"
normalizeCity("Ciudad Juárez")          // → "ciudad-juarez"
```

## State ISO Codes

32 Mexican states with ISO 3166-2 codes:

| State | ISO | State | ISO |
|-------|-----|-------|-----|
| Aguascalientes | AGU | Nuevo León | NLE |
| Baja California | BCN | Oaxaca | OAX |
| Baja California Sur | BCS | Puebla | PUE |
| Campeche | CAM | Querétaro | QRO |
| Chiapas | CHP | Quintana Roo | ROO |
| Chihuahua | CHH | San Luis Potosí | SLP |
| Coahuila | COA | Sinaloa | SIN |
| Colima | COL | Sonora | SON |
| Ciudad de México | CMX | Tabasco | TAB |
| Durango | DUR | Tamaulipas | TAM |
| Guanajuato | GTO | Tlaxcala | TLA |
| Guerrero | GRO | Veracruz | VER |
| Hidalgo | HID | Yucatán | YUC |
| Jalisco | JAL | Zacatecas | ZAC |
| México | MEX | | |
| Michoacán | MIC | | |
| Morelos | MOR | | |
| Nayarit | NAY | | |

## Security Features

- **Subscriber API Key Auth**: All `/api/*` routes protected via `x-api-key` header validated against `subscribers` table
- **Per-Subscriber Rate Limiting**: Per-minute and per-day limits tracked in `api_usage` table
- **Helmet**: Security headers (XSS protection, content-type sniffing, etc.)
- **Error Sanitization**: Stack traces hidden in production mode
- **Request Logging**: Morgan HTTP logging → Winston structured logs
- **SQL Injection Prevention**: Supabase client uses parameterized queries

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `SUPABASE_URL` | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | - | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Supabase service role key |

## Managing Subscribers

### Generate API Key

```bash
node scripts/generate-api-key.js
# Output: pcx_296475ae3f472f95d3817901167e1537e89fb8b81a9b960c
```

### Add Subscriber (via Supabase Dashboard)

1. Go to Supabase → Project → Table Editor → subscribers
2. Insert new row:
   - `email`: user@example.com
   - `api_key`: pcx_... (from generate-api-key.js)
   - `name`: User Name
   - `tier`: free
   - `is_active`: true
   - `rate_limit`: 30
   - `daily_limit`: 500

## Important Notes

- File encoding: Latin-1 (ISO-8859-1) - required for Spanish characters (ñ, á, é, etc.)
- Import uses `DELETE FROM sepomex` before insert (replaces all data)
- Batch size: 1000 records per transaction
- State ISO codes are case-insensitive in all endpoints
- Health endpoint `/health` does not require authentication
- City names returned by `/states/:iso/cities` are original (not normalized) names
- Rate limits are enforced per-subscriber based on their tier settings