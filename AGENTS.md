# Sepomex API

## Purpose

A REST API for importing and looking up Mexican postal codes (Códigos Postales) from the SEPOMEX database. Built with Express.js and SQLite.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Package Manager**: pnpm
- **File Upload**: Multer (memory storage)

## Project Structure

```
/src
  /controllers    - Request handlers (sepomexController.js)
  /db             - SQLite database config (database.js)
  /middlewares    - Validation (validateFileExtension.js)
  /routes         - Route definitions (sepomexRoutes.js)
  /services       - Business logic (sepomexService.js)
  /utils          - Helpers (fileStorage.js)
  app.js          - Express app configuration
  server.js       - Server entry point
/uploads - Uploaded files directory
/data            - SQLite database directory
```

## API Endpoints

### POST /api/sepomex/import
- **Purpose**: Import SEPOMEX txt/csv file
- **Input**: Multipart form with `file` field
- **Validation**: File extension (.txt or .csv), file size limit50MB
- **Behavior**: Truncates existing data, batch inserts new records (1000 per transaction)
- **Response**: `{ success, filename, originalName, totalRecords }`

### GET /api/sepomex/lookup
- **Purpose**: Query postal code data
- **Query Params**: `zipcode`, `city`, `state`, `group` (boolean)
- **When group=true**: Groups neighborhoods into array per zipcode/city/state/municipality
- **Response**: `{ success, data: [...] }`

### GET /health
- **Purpose**: Health check
- **Response**: `{ status: "ok" }`

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

## Data Flow

1. **Import**: File upload → Memory storage (Multer) → Parse (Latin-1 encoding) → Batch insert (SQLite transaction) → Save to disk
2. **Lookup**: Query params → SQLite prepared statement → Return results (grouped if requested)

## Important Notes

- File encoding: Latin-1 (ISO-8859-1) - required for Spanish characters (ñ, á, é, etc.)
- Import uses `DELETE FROM sepomex` before insert (replaces all data)
- Batch size: 1000 records per transaction
- Database uses WAL mode for concurrent reads
