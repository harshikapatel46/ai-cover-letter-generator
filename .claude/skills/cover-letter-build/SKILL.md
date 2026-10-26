---
name: cover-letter-build
description: "Build, debug, or refine the tailored cover letter generator while staying aligned with scope.md, prd.md, and spec.md. Use for implementation, API, UI, validation, and regression work in this project."
argument-hint: "Describe the focused change to implement or verify"
user-invocable: true
---

# Cover Letter Generator Build

Use this skill for focused implementation work on the cover-letter generator.

## Before Editing

1. Read the relevant sections of `scope.md`, `prd.md`, and `spec.md`.
2. Inspect the current implementation before proposing a new pattern or dependency.
3. State the smallest file set needed for the requested change.
4. If the request conflicts with the planning documents, ask for a scope decision instead of silently changing the product.

## Implementation Rules

- Preserve the single-page journey and existing user-facing behavior unless the request explicitly changes it.
- Keep browser-only behavior in client components and provider/API secrets in the server route.
- Validate user input at the API boundary and return clear HTTP errors.
- Use typed data shapes and existing dependencies; do not invent libraries or APIs.
- Make surgical changes and avoid unrelated refactors.

## Verification

1. Run `npm run build`.
2. If the change affects generation, verify the request payload, response shape, loading state, and error state.
3. If the change affects output actions, verify editing, copy, and `.txt` download behavior.
4. Report any unverified behavior explicitly.

## Completion Check

Before finishing, confirm that the change:

- fits the approved scope;
- matches the PRD behavior;
- matches the spec's interfaces;
- preserves existing working behavior; and
- has a recorded validation result.
