# Postal Lookup MX API

A REST API for importing and looking up Mexican postal codes (Códigos Postales) from the SEPOMEX database. Built with Express.js and Supabase PostgreSQL.

## Overview

This API allows you to import SEPOMEX data files and query them by zipcode, city, or state. Data is stored in Supabase PostgreSQL for fast lookups with per-subscriber rate limiting and usage tracking.

## Requirements

- Node.js 18+
- pnpm
- Supabase account (for database)

## Installation

```bash
pnpm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development`/`production`) | `development` |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | Supabase anon key | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - |

## Database Setup

### Apply Migrations

The database schema is managed via Supabase migrations. The following tables and functions are required:

1. **state_mapping** - Maps state names to ISO codes
2. **sepomex** - Main postal codes data
3. **subscribers** - Subscriber accounts with API keys
4. **api_usage** - Usage tracking for rate limiting
5. **increment_usage()** - Stored function for atomic usage upsert

See `AGENTS.md` for the complete schema.

## Running the Server

```bash
pnpm start        # Production
pnpm dev          # Development (with auto-reload)
```

The server runs on port 3000 by default.

## Subscriber Authentication

All API endpoints require a subscriber API key via the `x-api-key` header:

```bash
curl -H "x-api-key: pcx_9b13990167b67a70d4e75a8b751072c10aa05cb2a40adb7e" \
  "http://localhost:3000/api/postal-codes/01000"
```

**Error Responses:**

| Status | Error |
|--------|-------|
| 401 | `Missing API key. Include x-api-key header.` |
| 401 | `Invalid API key` |
| 403 | `API key is inactive. Contact support.` |

## Rate Limits

Each subscriber has per-minute and per-day rate limits based on their tier:

| Tier | Per Minute | Per Day |
|------|------------|---------|
| Free | 30 | 500 |
| Pro | 100 | 2000 |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-DailyLimit-Remaining: 499
```

When exceeded, returns `429` with a `Retry-After` header.

## Managing Subscribers

### Generate API Key

```bash
node scripts/generate-api-key.js
```

Output: `pcx_296475ae3f472f95d3817901167e1537e89fb8b81a9b960c`

### Add Subscriber (via Supabase Dashboard)

1. Go to **Supabase → Project → Table Editor → subscribers**
2. Insert new row with:
   - `email`: user@example.com
   - `api_key`: pcx_... (from generate-api-key.js)
   - `name`: User Name
   - `tier`: free
   - `is_active`: true
   - `rate_limit`: 30
   - `daily_limit`: 500

## API Endpoints

### POST /api/import

Import a SEPOMEX data file. The file should be a `.txt` or `.csv` with pipe-delimited data.

**Request:**
```
POST /api/import
Content-Type: multipart/form-data
x-api-key: <subscriber-api-key>

file: <CPdescarga.txt>
```

**Response:**
```json
{
  "success": true,
  "filename": "1780156525724-f609fda3.txt",
  "originalName": "CPdescarga.txt",
  "totalRecords": 158216
}
```

### GET /api/postal-codes/:zipcode

Get all settlements (neighborhoods) for a given zipcode.

**Request:**
```
GET /api/postal-codes/76148
x-api-key: <subscriber-api-key>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "zipcode": "76148",
      "neighborhood": "Alameda Residencial",
      "municipality": "Querétaro",
      "city": "Santiago de Querétaro",
      "state": "Querétaro",
      "state_iso_code": "QRO"
    }
  ]
}
```

### GET /api/postal-codes/:zipcode/grouped

Get settlements grouped by city/municipality for a given zipcode.

**Request:**
```
GET /api/postal-codes/76148/grouped
x-api-key: <subscriber-api-key>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "zipcode": "76148",
      "city": "Santiago de Querétaro",
      "state": "Querétaro",
      "stateIso": "QRO",
      "municipality": "Querétaro",
      "neighborhoods": ["Alameda Residencial", "Amalia Solórzano", "..."]
    }
  ]
}
```

### GET /api/states/:stateIso/cities

Get all city names in a given state. The state ISO code is case-insensitive.

**Request:**
```
GET /api/states/QRO/cities
GET /api/states/qro/cities
x-api-key: <subscriber-api-key>
```

**Response:**
```json
{
  "success": true,
  "data": ["El Pueblito", "San Juan del Rio", "Santiago de Querétaro"]
}
```

### GET /api/states/:stateIso/cities/:normalizedCity/postal-codes

Get all postal codes and neighborhoods for a specific city in a state.

**Request:**
```
GET /api/states/QRO/cities/santiago-de-queretaro/postal-codes
x-api-key: <subscriber-api-key>
```

**Response:**
```json
{
  "success": true,
  "state": "QRO",
  "city": "Santiago de Querétaro",
  "postalCodes": [
    {
      "zipcode": "76000",
      "municipality": "Querétaro",
      "neighborhoods": ["Centro", "La Cruz", "Mariano Escobedo"]
    }
  ]
}
```

### GET /health

Health check endpoint (no authentication required).

**Response:**
```json
{ "status": "ok" }
```

## City Normalization

When using the `/states/:stateIso/cities/:normalizedCity/postal-codes` endpoint, the city name must be normalized:

- Lowercase
- No accents (é → e, ñ → n, etc.)
- Spaces replaced with hyphens
- Special characters removed

**Example:** `Santiago de Querétaro` → `santiago-de-queretaro`

## State ISO Codes

| State | ISO Code |
|-------|----------|
| Aguascalientes | AGU |
| Baja California | BCN |
| Baja California Sur | BCS |
| Campeche | CAM |
| Chiapas | CHP |
| Chihuahua | CHH |
| Coahuila | COA |
| Colima | COL |
| Ciudad de México | CMX |
| Durango | DUR |
| Guanajuato | GTO |
| Guerrero | GRO |
| Hidalgo | HID |
| Jalisco | JAL |
| México | MEX |
| Michoacán | MIC |
| Morelos | MOR |
| Nayarit | NAY |
| Nuevo León | NLE |
| Oaxaca | OAX |
| Puebla | PUE |
| Querétaro | QRO |
| Quintana Roo | ROO |
| San Luis Potosí | SLP |
| Sinaloa | SIN |
| Sonora | SON |
| Tabasco | TAB |
| Tamaulipas | TAM |
| Tlaxcala | TLA |
| Veracruz | VER |
| Yucatán | YUC |
| Zacatecas | ZAC |

## Data Structure

The SEPOMEX file maps to the following database schema:

| File Field | Database Column | Description |
|-----------|----------------|-------------|
| d_codigo | zipcode | Postal code |
| d_asenta | neighborhood | Settlement/Colony name |
| d_mnpio | municipality | Municipality |
| d_ciudad | city | City |
| d_estado | state | State |

## Security Features

- **Subscriber API Key Authentication**: All API endpoints require `x-api-key` header validated against `subscribers` table
- **Per-Subscriber Rate Limiting**: Per-minute and per-day limits tracked in `api_usage` table
- **Helmet**: Security headers enabled by default
- **Input Sanitization**: Parameterized queries prevent SQL injection
- **Error Sanitization**: Stack traces hidden in production
- **Monitoring**: Morgan (request logging) + Winston (structured error logging)

## Project Structure

```
/src
  /controllers    - Request handlers (sepomexController.js)
  /db             - Supabase client config (supabase.js)
  /middlewares    - Auth & validation (auth.js, rateLimiter.js, validateFileExtension.js)
  /routes         - API route definitions (postalCodesRoutes.js, statesRoutes.js)
  /services       - Business logic (sepomexService.js)
  /utils          - Helper functions (logger.js, normalize.js, fileStorage.js)
  app.js          - Express configuration
  server.js       - Entry point
/scripts          - CLI tools (generate-api-key.js)
/uploads          - Uploaded files storage
```

## Notes

- Each import replaces all existing data (truncate + insert)
- File size limit: 50MB
- Batch inserts of 1000 records for performance
- State ISO codes are case-insensitive in endpoints
- Rate limits are enforced per-subscriber based on their tier settings
- File encoding: Latin-1 (ISO-8859-1) for Spanish characters