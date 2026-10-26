# Cover Letter Generator Project Guidelines

## Scope Guardrails

- Keep this project a single-page proof of concept for generating one tailored cover letter.
- Treat [scope.md](../scope.md), [prd.md](../prd.md), and [spec.md](../spec.md) as the source of truth.
- Before adding a feature, confirm that it supports the documented user journey. If it does not, stop and ask rather than expanding scope.
- Do not add authentication, a database, persistent user profiles, unrelated pages, or extra AI features.

## Technical Conventions

- Use the existing Next.js App Router, TypeScript, React, Tailwind CSS, and Lucide React stack.
- Reuse existing components and patterns before adding dependencies.
- Keep the Google Gemini provider call server-side in `app/api/generate/route.ts`; never expose API keys to client code.
- Preserve the current flow: resume and job description input, tone/company options, generation, editing, copying, and `.txt` download.

## Validation

- After code changes, run `npm run build`.
- Check the changed behavior against the PRD and API schema in the spec.
- Do not claim success without reporting validation results.
- Keep error handling explicit and user-visible; do not silently fall back to fabricated output.
