# Technical Specification

## Tech Stack

- Framework: Next.js (App Router, TypeScript)
- Styling: Tailwind CSS
- Icons: Lucide-React
- AI API: Google Gemini via the `@google/genai` SDK

## File Structure

- app/api/generate/route.ts: API route handling LLM generation
- app/page.tsx: Client-side UI form and editor
- .env.local: `GEMINI_API_KEY` and optional `GEMINI_MODEL` configuration
- .env.example: Secret-free environment variable template
- README.md: Local setup and verification instructions

## API Contract

- `POST /api/generate` accepts `resume`, `jobDescription`, `companyName`, and
  `tone` as JSON.
- `tone` must be `Professional`, `Modern`, or `Executive`.
- Resume and job-description input must be at least 40 characters and are
  bounded to protect request size and API cost.
- Successful responses return `{ "coverLetter": string }`.
- Errors return `{ "error": string }` with an HTTP error status.
- The server rejects generated responses that are not exactly three paragraphs.

## Failure Modes

- Invalid JSON or invalid field values return HTTP 400.
- Missing Gemini configuration returns HTTP 500 without exposing the key.
- Generation timeouts return HTTP 504.
- Provider failures return a controlled HTTP 500 message.
