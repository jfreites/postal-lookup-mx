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
| `RATE_LIMIT_IMPORT_MAX` | Max import requests per window | `5` |
| `LOG_LEVEL` | Logging level (`info`/`warn`/`error`) | `info` |

## Running the Server

```bash
pnpm start        # Production
pnpm dev          # Development (with auto-reload)
```

The server runs on port 3000 by default.

## Authentication

All API endpoints require authentication via the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" "http://localhost:3000/api/postal-codes/01000"
```

Requests without a valid API key receive a `401` response:
```json
{"success":false,"error":"Invalid or missing API key"}
```

## API Endpoints

### POST /api/import

Import a SEPOMEX data file. The file should be a `.txt` or `.csv` with pipe-delimited data.

**Request:**
```
POST /api/import
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

### GET /api/postal-codes/:zipcode

Get all settlements (neighborhoods) for a given zipcode.

**Request:**
```
GET /api/postal-codes/76148
x-api-key: <your-api-key>
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
x-api-key: <your-api-key>
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
x-api-key: <your-api-key>
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
x-api-key: <your-api-key>
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

- **API Key Authentication**: All API endpoints require `x-api-key` header
- **Rate Limiting**: Configurable per-endpoint limits to prevent abuse
- **Helmet**: Security headers enabled by default
- **Input Sanitization**: Parameterized queries prevent SQL injection
- **Error Sanitization**: Stack traces hidden in production
- **Monitoring**: Morgan (request logging) + Winston (structured error logging)

## Project Structure

```
/src
  /controllers    - Request handlers
  /db             - SQLite database configuration
  /middlewares    - Request validation & auth
  /routes         - API route definitions
  /services       - Business logic
  /utils          - Helper functions (logger.js, normalize.js)
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
- State ISO codes are case-insensitive in endpoints