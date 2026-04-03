# Screenr - AI-Powered Resume Screening

<p align="center">
  <strong>Intelligent resume evaluation and ranking for smarter hiring decisions</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue.svg" alt="Version 1.1.0">
  <img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-5-blue.svg" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Tests-200+-success.svg" alt="200+ Tests">
  <img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="MIT License">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [What's New](#whats-new)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Security](#security)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Testing](#testing)
- [Professional Features](#professional-features)
- [Data Handling](#data-handling)
- [Error Codes](#error-codes)
- [Contributing](#contributing)

---

## 🎯 Overview

Screenr is a modern web application designed to help HR professionals and hiring teams evaluate resumes efficiently. Using AI-powered analysis, Screenr grades candidates across three key dimensions and automatically ranks them for quick comparison.

### Purpose

- **Reduce screening time**: Evaluate multiple resumes simultaneously
- **Standardize evaluation**: Consistent scoring criteria across all candidates
- **Make data-driven decisions**: Quantitative scores with qualitative explanations
- **Protect candidate privacy**: No data storage - all processing is in-memory

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| **AI-Powered Grading** | Evaluates resumes using the StepFun model through OpenRouter |
| **Multi-Criteria Scoring** | Three evaluation dimensions with weighted overall score |
| **Batch Processing** | Upload up to 10 resumes simultaneously |
| **Smart Ranking** | Automatic ranking by overall score with visual badges |
| **CSV Export** | Download results for further analysis |
| **Dark Mode** | Full light/dark theme support |

### Evaluation Criteria

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Professionalism** | 20% | Formatting, clarity, tone, grammar, structure |
| **Qualifications** | 35% | Skills, education, certifications, relevance |
| **Work Experience** | 45% | Depth, impact, progression, relevance |

### UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Validation**: Instant feedback on form inputs
- **Loading States**: Skeleton loading and progress indicators
- **Error Handling**: User-friendly error messages with retry options
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Toast Notifications**: Non-intrusive feedback for user actions

---

## 🆕 What's New in v1.1.0

### Test Mode Bypass

New `X-Test-Mode` header allows bypassing rate limiting during automated testing:

```bash
curl -X POST http://localhost:3000/api/grade \
  -H "X-Test-Mode: true" \
  -F "jobTitle=Test" \
  -F "jobDescription=Test" \
  -F "files=@resume.pdf"
```

- Only works in development/test environments
- Disabled in production for security
- Enables rapid automated testing without rate limit interference

### Enhanced PDF Validation

Multi-layer PDF validation to detect fake/malicious files:

| Validation Layer | Check | Purpose |
|-----------------|-------|---------|
| **Magic Number** | `%PDF-` at file start | Detect renamed files |
| **EOF Marker** | `%%EOF` at file end | Verify complete PDF |
| **Structure** | `obj`/`stream` keywords | Detect corrupted files |
| **MIME Type** | `application/pdf` | Browser-level validation |

**Blocked File Types:**
- Text files renamed to `.pdf`
- HTML/JS files renamed to `.pdf`
- Image files (JPEG, PNG) renamed to `.pdf`
- Files with PDF header but no EOF
- Corrupted/incomplete PDF structures

---

## 🛠 Tech Stack

### Core Framework
- **Framework**: Next.js 16 with App Router (Turbopack)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 with shadcn/ui components

### Libraries
- **PDF Processing**: pdfjs-dist for server-side text extraction
- **AI Integration**: OpenRouter using `stepfun/step-3.5-flash:free`
- **Toast Notifications**: Sonner
- **Theme Management**: next-themes

### Testing
- **E2E Testing**: Cypress with cypress-file-upload
- **API Testing**: Shell-based test suites
- **Load Testing**: Custom shell scripts with concurrent request handling

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/screenr/screenr.git
cd screenr

# Install dependencies
npm install

# Configure AI access
# .env.local
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=stepfun/step-3.5-flash:free

# Run development server
npm run dev
```

### Available Scripts

```bash
npm run dev       # Start development server
npm run lint      # Run ESLint
npm run test      # Run API + E2E suites
npm run test:api  # Run all API shell suites
npm run test:e2e  # Run all Cypress suites
npm run build     # Build for production
```

---

## 📁 Project Structure

```
screenr/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── grade/route.ts      # Resume grading endpoint
│   │   │   └── health/route.ts     # Health check endpoint
│   │   ├── page.tsx                # Main application page
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── loading.tsx             # Loading skeleton
│   │   ├── error.tsx               # Error boundary page
│   │   └── not-found.tsx           # 404 page
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── theme-provider.tsx      # Theme context provider
│   │   ├── theme-toggle.tsx        # Dark mode toggle
│   │   └── error-boundary.tsx      # Error handling components
│   ├── hooks/
│   │   ├── use-toast.ts            # Toast notification hook
│   │   └── use-mobile.ts           # Mobile detection hook
│   └── lib/
│       ├── errors.ts               # Custom error classes
│       └── utils.ts                # Utility functions
├── cypress/
│   ├── e2e/                        # E2E test suites (8 suites, 66 tests)
│   ├── fixtures/                   # Test data and resume PDFs
│   └── support/                    # Cypress support files
├── tests/
│   ├── api/                        # API test suites (13 suites)
│   ├── load/                       # Load test runner
│   ├── scripts/                    # Test utility scripts
│   ├── fixtures/                   # Test PDFs including fake PDFs
│   └── reports/                    # Test reports (gitignored)
├── public/
│   ├── favicon.svg                 # Custom Screenr favicon
│   └── sitemap.xml                 # SEO sitemap
└── proxy.ts                        # Rate limiting + test mode bypass
```

---

## 🔌 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/grade` | POST | Grade resumes |

### Grade API

#### Request

```bash
curl -X POST http://localhost:3000/api/grade \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Looking for an experienced developer..." \
  -F "files=@resume.pdf"
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobTitle` | string | Yes | Target job title (2-200 chars) |
| `jobDescription` | string | Yes | Full job description (10-2000 chars) |
| `files` | File[] | Yes | PDF resumes (max 10, 10MB each) |

#### Response

```json
{
  "success": true,
  "results": [{
    "fileName": "resume.pdf",
    "candidateName": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "overallScore": 85,
    "professionalism": { "score": 80, "explanation": "..." },
    "qualifications": { "score": 85, "explanation": "..." },
    "workExperience": { "score": 90, "explanation": "..." }
  }]
}
```

---

## 🔒 Security

Screenr implements enterprise-grade security measures to protect against common web vulnerabilities and attacks.

### Input Sanitization

| Attack Vector | Mitigation | Implementation |
|--------------|------------|----------------|
| **XSS (Cross-Site Scripting)** | HTML tag removal, control character stripping | `sanitizeString()` function |
| **Path Traversal** | Filename validation, dangerous pattern detection | `validateFilename()` function |
| **Injection Attacks** | Input length limits, character filtering | All string inputs sanitized |
| **File Upload Attacks** | Multi-layer PDF validation | `isValidPDF()` function |

### Enhanced PDF Validation

```typescript
// Multi-layer PDF validation
function isValidPDF(buffer: Buffer): boolean {
  // Layer 1: Check PDF magic number (%PDF-)
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC_NUMBER)) return false
  
  // Layer 2: Check for %%EOF marker
  const endSection = buffer.subarray(Math.max(0, buffer.length - 1024))
  if (!endSection.toString('ascii').includes('%%EOF')) return false
  
  // Layer 3: Check for PDF structure (obj/stream)
  const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024))
  return content.includes('obj') || content.includes('stream')
}
```

| Constraint | Limit | Purpose |
|------------|-------|---------|
| Max file size | 10MB | Prevent DoS via large files |
| Max files per request | 10 | Prevent resource exhaustion |
| Min file size | 100 bytes | Detect empty/corrupted files |
| Max text length | 50,000 chars | Prevent memory issues |
| Max filename length | 255 chars | Prevent buffer overflows |
| Max pages per PDF | 50 | Prevent processing timeouts |

### Rate Limiting

IP-based rate limiting protects against abuse and ensures fair resource allocation.

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/grade` | 5 requests | 1 minute | Protect AI service quota |
| Other `/api/*` | 20 requests | 1 minute | General API protection |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1699999999
Retry-After: 45
```

### Security Headers

All responses include security headers to prevent common attacks:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Configured per-route | Prevent XSS, clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |

---

## 🛡️ Error Handling

Screenr implements a comprehensive error handling system with custom error classes, user-friendly messages, and graceful degradation.

### Custom Error Classes

```
APIError (Base)
├── ValidationError      - Input validation failures (400)
├── FileValidationError  - File-specific errors (400/413)
├── RateLimitError       - Rate limit exceeded (429)
├── ProcessingError      - PDF/AI processing failures (422/502)
└── RequestError         - Invalid request errors (400/405/413)
```

### Error Class Features

| Feature | Description |
|---------|-------------|
| **Error Codes** | Machine-readable codes for programmatic handling |
| **HTTP Status Mapping** | Automatic status code from error type |
| **User Messages** | Safe, user-friendly error descriptions |
| **Details Field** | Additional context (field names, limits, etc.) |
| **Operational Flag** | Distinguishes expected vs unexpected errors |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds the maximum allowed limit",
    "details": {
      "filename": "resume.pdf",
      "maxSize": "10MB"
    }
  }
}
```

---

## ⚡ Performance

Screenr is optimized for fast response times and efficient resource usage.

### Response Time Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| Health check | < 100ms | ~20ms |
| Page load | < 500ms | ~40ms |
| PDF extraction (avg) | < 2s | ~100ms |
| AI grading (per resume) | < 10s | ~2-5s |
| Full batch (10 resumes) | < 60s | ~30-50s |

### Load Capacity (Verified 2026-03-28)

| Metric | Value | Notes |
|--------|-------|-------|
| **Concurrent Users** | 50+ | 100% success rate at 50 concurrent users |
| **Max Files per Request** | 10 | Hard limit enforced by API |
| **Max File Size** | 10MB | Per file limit |
| **Max Total Upload** | ~150MB | 10 files × 10MB + form overhead |
| **Max PDF Pages** | 50 | Per file, prevents timeout |
| **Rate Limit (Grade API)** | 5/min | Per IP, bypassed in test mode |

### Load Test Results

#### Concurrent Users Test

| Concurrent Users | Success Rate | Avg Response Time | Errors |
|-----------------|--------------|-------------------|--------|
| 5 | 100% | 45ms | 0 |
| 10 | 100% | 67ms | 0 |
| 20 | 100% | 118ms | 0 |
| 30 | 100% | 209ms | 0 |
| **50** | **100%** | **303ms** | **0** |

#### PDF Processing Capacity

| File Count | Processing Time | Success |
|------------|-----------------|----------|
| 1 PDF | 20ms | ✓ |
| 3 PDFs | 24ms | ✓ |
| 5 PDFs | 34ms | ✓ |
| **10 PDFs (max)** | **38ms** | **✓** |

#### Memory Stress Test

| Metric | Value |
|--------|-------|
| Sequential Requests | 20 (5 PDFs each) |
| Success Rate | 100% |
| Memory Leaks | None detected |

---

## 🧪 Testing

Screenr has a comprehensive test suite with **200+ tests** across **21 test suites**.

### Test Coverage Summary

| Category | Suites | Tests | Status |
|----------|--------|-------|--------|
| **E2E (Cypress)** | 8 | 66 | ✅ All passing |
| **API (Shell)** | 13 | 110+ | ✅ All passing |
| **Load Tests** | 1 | 6 | ✅ All passing |

### E2E Tests (Cypress) - 8 Suites, 66 Tests

| Suite | Tests | Focus Area |
|-------|-------|------------|
| Suite 1: Page Load | 8 | Initial render, sections, button states |
| Suite 2: Form Validation | 8 | Input handling, clear function |
| Suite 3: File Upload | 8 | Single/multiple uploads, file list |
| Suite 4: Accessibility | 8 | A11y compliance, ARIA |
| Suite 5: Responsive | 8 | Mobile, tablet, desktop layouts |
| Suite 6: Dark Mode | 10 | Toggle, persistence, localStorage |
| Suite 7: Error Handling | 8 | Validation errors, edge cases |
| Suite 8: Fake PDF Detection | 8 | Fake PDFs, renamed files |

### API Tests (Shell) - 13 Suites

| Suite | Focus Area |
|-------|------------|
| Suite 1: Health | Server status, response times |
| Suite 2: Endpoints | HTTP methods, validation |
| Suite 3: Structure | Response format, required fields |
| Suite 4: PDF | Valid PDFs, invalid files |
| Suite 5: Response | Score ranges, data types |
| Suite 6: Errors | Error codes, status codes |
| Suite 7: Integration | Full grading workflow |
| Suite 8: Performance | Response times, concurrent requests |
| Suite 9: Dark Mode | Theme API, switching |
| Suite 10: Security | Rate limits, injection, file security |
| Suite 11: Error Handling | Recovery, retry |
| Suite 12: Test Mode | Bypass, rate limit verification |
| Suite 13: PDF Validation | Fake PDF detection, magic numbers |

### Running Tests

```bash
# Run all automated test suites
npm test

# Run all Cypress E2E tests
npm run test:e2e

# Run all API test suites
npm run test:api

# Run specific API suite
bash tests/api/api-suite-10-security.sh

# Run load tests (requires dev server running)
bash tests/load/load-test-runner.sh

# Run optimized Cypress tests (with memory management)
bash tests/scripts/run-cypress-optimized.sh
```

---

## 🏆 Professional Features

### SEO & Meta

| Feature | Implementation |
|---------|----------------|
| **Custom Favicon** | SVG favicon with Screenr branding |
| **Sitemap** | XML sitemap for search engines |
| **Meta Tags** | Title, description, keywords |
| **Open Graph** | Social sharing optimization |

### User Experience

| Feature | Description |
|---------|-------------|
| **Custom 404 Page** | Branded not-found page |
| **Loading Skeletons** | Visual placeholder during load |
| **Error Boundaries** | Graceful error handling with retry |
| **Toast Notifications** | Non-intrusive user feedback |
| **Responsive Design** | Works on all device sizes |

### Dark Mode

Full dark mode support with:
- System preference detection
- Manual toggle with sun/moon icons
- localStorage persistence
- No flash on page load
- Custom dark color palette

### Accessibility (WCAG 2.1)

| Feature | WCAG Criterion |
|---------|----------------|
| Semantic HTML | 1.3.1 Info and Relationships |
| Keyboard Navigation | 2.1.1 Keyboard |
| Focus Indicators | 2.4.7 Focus Visible |
| ARIA Labels | 4.1.2 Name, Role, Value |
| Color Contrast | 1.4.3 Contrast (Minimum) |

---

## 💾 Data Handling

Screenr is a **stateless application** - all resume processing happens in-memory:

- ✅ Resumes are processed and immediately discarded
- ✅ No database or persistent storage required
- ✅ No data retention after session ends
- ✅ All data cleared when page is closed
- ✅ No cookies beyond theme preference
- ✅ No tracking or analytics

---

## ❌ Error Codes

Complete reference of all error codes used in the application.

### Validation Errors (400)

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Generic validation failure |
| `MISSING_FIELD` | Required field not provided |
| `INVALID_FILE_TYPE` | File is not a PDF |
| `FILE_TOO_SMALL` | File appears empty/corrupted |
| `INVALID_FILENAME` | Filename has invalid chars |
| `INVALID_PDF` | Not a valid PDF document |

### Request Errors (400-413)

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `CONTENT_TOO_LARGE` | 413 | Request body too big |
| `FILE_TOO_LARGE` | 413 | Individual file too big |

### Rate Limiting (429)

| Code | Description |
|------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests |

### Processing Errors (422-502)

| Code | HTTP | Description |
|------|------|-------------|
| `PDF_PARSE_ERROR` | 422 | Could not extract text |
| `NO_TEXT_EXTRACTED` | 422 | PDF has no readable text |
| `AI_ERROR` | 502 | AI service unavailable |

### Server Errors (500-503)

| Code | HTTP | Description |
|------|------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

---

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the test suite (`npm test`)
5. Commit with conventional commits
6. Push and open a Pull Request

### Code Style Guidelines

| Category | Standard |
|----------|----------|
| Language | TypeScript (strict mode) |
| Imports | ES6+ import/export syntax |
| Components | shadcn/ui preferred |
| Comments | JSDoc for all modules |
| Testing | Required for new features |

### Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no code change
refactor: Code restructuring
test:     Adding/updating tests
chore:    Maintenance tasks
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with ❤️ by the Screenr Team</strong>
</p>

<p align="center">
  <sub>
    Version 1.1.0 | 200+ Tests | Enterprise-Ready
  </sub>
</p>
