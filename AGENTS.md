# Sepomex API

## Purpose

A REST API for importing and looking up Mexican postal codes (Códigos Postales) from the SEPOMEX database. Built with Express.js and SQLite.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Package Manager**: pnpm
- **File Upload**: Multer (memory storage)
- **Security**: Helmet, express-rate-limit, API key auth

## Project Structure

```
/src
  /controllers    - Request handlers (sepomexController.js)
  /db             - SQLite database config (database.js)
  /middlewares    - Auth & validation (auth.js, validateFileExtension.js)
  /routes         - Route definitions (postalCodesRoutes.js, statesRoutes.js)
  /services       - Business logic (sepomexService.js)
  /utils          - Helpers (fileStorage.js, normalize.js)
  app.js          - Express app configuration
  server.js       - Server entry point
/uploads         - Uploaded files directory
/data            - SQLite database directory
```

## API Endpoints

### POST /api/import
- **Purpose**: Import SEPOMEX txt/csv file
- **Auth**: Required (`x-api-key` header)
- **Rate Limit**: 5 requests/minute
- **Input**: Multipart form with `file` field
- **Validation**: File extension (.txt or .csv), file size limit 50MB
- **Behavior**: Truncates existing data, batch inserts new records (1000 per transaction)
- **Response**: `{ success, filename, originalName, totalRecords }`

### GET /api/postal-codes/:zipcode
- **Purpose**: Get all settlements for a zipcode
- **Auth**: Required (`x-api-key` header)
- **Response**: `{ success, data: [{ zipcode, neighborhood, municipality, city, state, state_iso_code }] }`

### GET /api/postal-codes/:zipcode/grouped
- **Purpose**: Get settlements grouped by city/municipality
- **Auth**: Required (`x-api-key` header)
- **Response**: `{ success, data: [{ zipcode, city, state, stateIso, municipality, neighborhoods: [...] }] }`

### GET /api/states/:stateIso/cities
- **Purpose**: List all cities in a state
- **Auth**: Required (`x-api-key` header)
- **Note**: `stateIso` is case-insensitive (QRO or qro)
- **Response**: `{ success, data: [cityName1, cityName2, ...] }`

### GET /api/states/:stateIso/cities/:normalizedCity/postal-codes
- **Purpose**: Get all postal codes and neighborhoods for a city
- **Auth**: Required (`x-api-key` header)
- **Note**: `stateIso` is case-insensitive
- **Response**: `{ success, state, city, postalCodes: [{ zipcode, municipality, neighborhoods: [...] }] }`

### GET /health
- **Purpose**: Health check
- **Auth**: Not required
- **Response**: `{ status: "ok" }`

## Authentication

All `/api/*` endpoints (except `/health`) require the `x-api-key` header:

```javascript
// Required header
x-api-key: <API_KEY>

// Missing/invalid returns 401
{ "success": false, "error": "Invalid or missing API key" }
```

## Database Schema

```sql
CREATE TABLE state_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_name TEXT NOT NULL,
  state_iso_code TEXT NOT NULL UNIQUE
);

CREATE TABLE sepomex (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zipcode TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  municipality TEXT NOT NULL,
  city TEXT,
  state TEXT NOT NULL,
  state_iso_code TEXT,
  normalized_city TEXT
);
-- Indexes on zipcode, state, city, state_iso_code, normalized_city
```

## Key Files

| File | Purpose |
|------|---------|
| `src/db/database.js` | SQLite connection, schema creation, state mapping data |
| `src/services/sepomexService.js` | File parsing, batch insert, all query methods |
| `src/controllers/sepomexController.js` | Request/response handling |
| `src/middlewares/auth.js` | API key authentication |
| `src/routes/postalCodesRoutes.js` | Rate limiter + postal codes routes |
| `src/routes/statesRoutes.js` | States and cities routes |
| `src/utils/normalize.js` | City name normalization function |

## Data Flow

1. **Import**: File upload → Memory storage (Multer) → Parse (Latin-1 encoding) → Map state names to ISO codes → Normalize city names → Batch insert (SQLite transaction) → Save to disk
2. **Lookup**: Route param → Service method → SQLite prepared statement → Return results (grouped or flat)

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

- **API Key Auth**: All `/api/*` routes protected via `x-api-key` header
- **Rate Limiting**: Import limited to 5/min (express-rate-limit)
- **Helmet**: Security headers (XSS protection, content-type sniffing, etc.)
- **Error Sanitization**: Stack traces hidden in production mode
- **SQL Injection Prevention**: Parameterized queries throughout

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `API_KEY` | - | Required for API authentication |
| `NODE_ENV` | development | Environment mode |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window (1 min) |
| `RATE_LIMIT_IMPORT_MAX` | 5 | Max import requests per window |

## Important Notes

- File encoding: Latin-1 (ISO-8859-1) - required for Spanish characters (ñ, á, é, etc.)
- Import uses `DELETE FROM sepomex` before insert (replaces all data)
- Batch size: 1000 records per transaction
- Database uses WAL mode for concurrent reads
- State ISO codes are case-insensitive in all endpoints
- Health endpoint `/health` does not require authentication
- City names returned by `/states/:iso/cities` are original (not normalized) names