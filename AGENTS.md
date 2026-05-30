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
  /routes         - Route definitions (sepomexRoutes.js)
  /services       - Business logic (sepomexService.js)
  /utils          - Helpers (fileStorage.js)
  app.js          - Express app configuration
  server.js       - Server entry point
/uploads         - Uploaded files directory
/data            - SQLite database directory
```

## API Endpoints

### POST /api/sepomex/import
- **Purpose**: Import SEPOMEX txt/csv file
- **Auth**: Required (`x-api-key` header)
- **Rate Limit**: 5 requests/minute
- **Input**: Multipart form with `file` field
- **Validation**: File extension (.txt or .csv), file size limit 50MB
- **Behavior**: Truncates existing data, batch inserts new records (1000 per transaction)
- **Response**: `{ success, filename, originalName, totalRecords }`

### GET /api/sepomex/lookup
- **Purpose**: Query postal code data
- **Auth**: Required (`x-api-key` header)
- **Rate Limit**: 100 requests/minute
- **Query Params**: `zipcode`, `city`, `state`, `group` (boolean)
- **When group=true**: Groups neighborhoods into array per zipcode/city/state/municipality
- **Response**: `{ success, data: [...] }`

### GET /health
- **Purpose**: Health check
- **Auth**: Not required
- **Response**: `{ status: "ok" }`

## Authentication

All `/api/sepomex/*` endpoints require the `x-api-key` header:

```javascript
// Required header
x-api-key: <API_KEY>

// Missing/invalid returns 401
{ "success": false, "error": "Invalid or missing API key" }
```

Configure via environment variable `API_KEY`.

## Database Schema

```sql
CREATE TABLE sepomex (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zipcode TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  municipality TEXT NOT NULL,
  city TEXT,
  state TEXT NOT NULL
);
-- Indexes on zipcode, state, city
```

## Key Files

| File | Purpose |
|------|---------|
| `src/db/database.js` | SQLite connection, schema creation |
| `src/services/sepomexService.js` | File parsing, batch insert, lookup logic |
| `src/controllers/sepomexController.js` | Request/response handling |
| `src/middlewares/validateFileExtension.js` | File extension validation |
| `src/middlewares/auth.js` | API key authentication |
| `src/routes/sepomexRoutes.js` | Rate limiters + auth middleware |

## Data Flow

1. **Import**: File upload → Memory storage (Multer) → Parse (Latin-1 encoding) → Batch insert (SQLite transaction) → Save to disk
2. **Lookup**: Query params → SQLite prepared statement → Return results (grouped if requested)

## Security Features

- **API Key Auth**: All `/api/sepomex/*` routes protected via `x-api-key` header
- **Rate Limiting**: Per-route limits (lookup: 100/min, import: 5/min) via `express-rate-limit`
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
| `RATE_LIMIT_LOOKUP_MAX` | 100 | Max requests per window |
| `RATE_LIMIT_IMPORT_MAX` | 5 | Max import requests per window |

## Important Notes

- File encoding: Latin-1 (ISO-8859-1) - required for Spanish characters (ñ, á, é, etc.)
- Import uses `DELETE FROM sepomex` before insert (replaces all data)
- Batch size: 1000 records per transaction
- Database uses WAL mode for concurrent reads
- Health endpoint `/health` does not require authentication