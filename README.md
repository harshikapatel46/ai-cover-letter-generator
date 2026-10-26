# One-Click Tailored Cover Letter Generator

A single-page Next.js proof of concept for job seekers who want to turn their
real resume achievements and a target job description into a tailored,
three-paragraph cover letter.

## What it does

- Accepts resume content by pasting text or uploading a `.txt`/`.md` file.
- Accepts a target job description.
- Supports an optional company name.
- Supports Professional, Modern, and Executive tones.
- Uses Google Gemini through a server-side API route.
- Shows the generated letter in an editable text area.
- Lets the user copy the letter or download it as a `.txt` file.
- Includes client-side input limits and visible loading/error states.

Resume files are read in the browser. The file itself is not uploaded; only
the extracted resume text is sent to `/api/generate`.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Google Gemini through `@google/genai`
- Lucide React icons

## Requirements

- Node.js 20 or newer
- A Google Gemini API key with access to one of the configured models

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and set `GEMINI_API_KEY`.
   `GEMINI_MODEL` is optional. The server starts with `gemini-3.5-flash` and
   has additional fallback model names configured in
   `app/api/generate/route.ts`.
3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Available scripts

```bash
npm run dev    # Start the development server
npm run build  # Create a production build and run TypeScript checks
npm start      # Start the production build
```

## How to try the proof of concept

1. Paste a resume or click **Upload Resume (.txt, .md)**.
2. Paste a job description.
3. Optionally enter a company name and choose a tone.
4. Click **Generate Cover Letter**.
5. Edit the result if needed.
6. Copy it or download it as a `.txt` file.

Resume text must be between 40 and 12,000 characters. Job descriptions must
be between 40 and 20,000 characters. Uploaded files must be plain text,
Markdown, and under 1 MB.

## API and security

The Gemini API key is read only by the server route at
`app/api/generate/route.ts`. Never prefix it with `NEXT_PUBLIC_`, expose it in
client-side code, or commit `.env.local`. Use `.env.example` as the
secret-free configuration template.

The API validates request shape, supported tones, input sizes, and generated
three-paragraph formatting. Generation requests have a server-side timeout and
return controlled error messages.

## Verification

Run the production build with:

```bash
npm run build
```

The current repository build and local request-validation checks pass. A
successful live Gemini response depends on the configured API key, model
availability, and network access.

## Project planning

The repository includes the project scope, PRD, technical specification,
Devpost Learn Skill Pack files, and the current build checklist. These
documents describe the proof-of-concept boundary and implementation decisions.
