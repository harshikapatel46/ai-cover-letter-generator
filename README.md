# One-Click Tailored Cover Letter Generator

A single-page Next.js app that uses a resume, target job description, company
name, and selected tone to generate an editable three-paragraph cover letter.

## Requirements

- Node.js 20 or newer
- A Google Gemini API key with access to the configured model

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and set `GEMINI_API_KEY`.
   `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash`, with
   additional configured model fallbacks in the server route.
3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Verification

Run the production build with:

```bash
npm run build
```

The Gemini API key is read only by the server route at
`app/api/generate/route.ts`; do not prefix it with `NEXT_PUBLIC_` or commit
`.env.local`.

## Current proof-of-concept flow

Paste a resume and job description, optionally provide a company and tone,
generate the letter, edit it if needed, then copy or download the result.
