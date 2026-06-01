# Security Improvements

## Priority 1: Input Validation & Rate Limiting
- [x] Install `express-rate-limit`
- [x] Configure rate limit for `/api/import` (5 requests/minute per IP)
- [x] Test rate limits

## Priority 2: Authentication - API Key
- [x] Add `x-api-key` header validation middleware
- [x] Store API key in environment variable
- [x] Apply to all `/api/*` routes
- [x] Return 401 for missing/invalid key
- [x] Test authentication

## Priority 3: CORS Configuration
- [ ] Restrict CORS to specific domain(s)

## Priority 4: Security Headers (Helmet)
- [x] Install helmet
- [x] Configure basic security headers
- [x] Disable x-powered-by header

## Priority 5: Network & Deployment
- [x] Add error sanitization (no stack traces in prod)
- [ ] Document HTTPS requirement

## Priority 6: File Upload Security
- [ ] Validate MIME type + magic bytes
- [ ] Document virus scanning recommendation

## Priority 7: Monitoring
- [x] Add request logging (Morgan)
- [x] Add structured error logging