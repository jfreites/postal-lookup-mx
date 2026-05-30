# Postal Lookup MX API

A REST API for importing and looking up Mexican postal codes (Códigos Postales) from the SEPOMEX database.

## Overview

This API allows you to import SEPOMEX data files and query them by zipcode, city, or state. The data is stored in a local SQLite database for fast lookups.

## Requirements

- Node.js 18+
- pnpm

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
| `API_KEY` | Authentication key for API requests | `dev-api-key-12345` |
| `NODE_ENV` | Environment (`development`/`production`) | `development` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `60000` |
| `RATE_LIMIT_LOOKUP_MAX` | Max lookup requests per window | `100` |
| `RATE_LIMIT_IMPORT_MAX` | Max import requests per window | `5` |

## Running the Server

```bash
pnpm start        # Production
pnpm dev          # Development (with auto-reload)
```

The server runs on port 3000 by default.

## Authentication

All `/api/sepomex/*` endpoints require authentication via the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" "http://localhost:3000/api/sepomex/lookup?zipcode=01000"
```

Requests without a valid API key receive a `401` response:
```json
{"success":false,"error":"Invalid or missing API key"}
```

## API Endpoints

### POST /api/sepomex/import

Import a SEPOMEX data file. The file should be a `.txt` or `.csv` with pipe-delimited data.

**Request:**
```
POST /api/sepomex/import
Content-Type: multipart/form-data
x-api-key: <your-api-key>

file: <CPdescarga.txt>
```

**Rate Limit:** 5 requests per minute

**Response:**
```json
{
  "success": true,
  "filename": "1780156525724-f609fda3.txt",
  "originalName": "CPdescarga.txt",
  "totalRecords": 158216
}
```

### GET /api/sepomex/lookup

Query the SEPOMEX database by zipcode, city, and/or state.

**Request:**
```
GET /api/sepomex/lookup?zipcode=76148
GET /api/sepomex/lookup?city=Santiago de Querétaro&state=Querétaro
GET /api/sepomex/lookup?zipcode=76148&group=true
```

**Headers:**
```
x-api-key: <your-api-key>
```

**Rate Limit:** 100 requests per minute

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| zipcode | string | Filter by zipcode |
| city | string | Filter by city |
| state | string | Filter by state |
| group | boolean | When `true`, groups neighborhoods into an array |

**Response (without group):**
```json
{
  "success": true,
  "data": [
    {
      "zipcode": "76148",
      "neighborhood": "Alameda Residencial",
      "municipality": "",
      "city": "Santiago de Querétaro",
      "state": "Querétaro"
    }
  ]
}
```

**Response (with group=true):**
```json
{
  "success": true,
  "data": [
    {
      "zipcode": "76148",
      "city": "Santiago de Querétaro",
      "state": "Querétaro",
      "municipality": "",
      "neighborhoods": ["Alameda Residencial", "Amalia Solórzano", "..."]
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

- **API Key Authentication**: All API endpoints require `x-api-key` header
- **Rate Limiting**: Configurable per-endpoint limits to prevent abuse
- **Helmet**: Security headers enabled by default
- **Input Sanitization**: Parameterized queries prevent SQL injection
- **Error Sanitization**: Stack traces hidden in production

## Project Structure

```
/src
  /controllers    - Request handlers
  /db             - SQLite database configuration
  /middlewares    - Request validation & auth
  /routes         - API route definitions
  /services       - Business logic
  /utils          - Helper functions
  app.js          - Express configuration
  server.js       - Entry point
/uploads         - Uploaded files storage
/data            - SQLite database storage
```

## Notes

- Each import replaces all existing data (truncate + insert)
- File size limit: 50MB
- Database uses WAL mode for concurrent reads
- Batch inserts of 1000 records for performance