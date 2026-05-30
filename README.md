# Sepomex API

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

## Running the Server

```bash
pnpm start        # Production
pnpm dev # Development (with auto-reload)
```

The server runs on port3000 by default.

## API Endpoints

### POST /api/sepomex/import

Import a SEPOMEX data file. The file should be a `.txt` or `.csv` with pipe-delimited data.

**Request:**
```
POST /api/sepomex/import
Content-Type: multipart/form-data

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

### GET /api/sepomex/lookup

Query the SEPOMEX database by zipcode, city, and/or state.

**Request:**
```
GET /api/sepomex/lookup?zipcode=76148
GET /api/sepomex/lookup?city=Santiago de Querétaro&state=Querétaro
GET /api/sepomex/lookup?zipcode=76148&group=true
```

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

Health check endpoint.

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
| D_mnpio | municipality | Municipality |
| d_ciudad | city | City |
| d_estado | state | State |

## Project Structure

```
/src
  /controllers    - Request handlers
  /db             - SQLite database configuration
  /middlewares    - Request validation
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
