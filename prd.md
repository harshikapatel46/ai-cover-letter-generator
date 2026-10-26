# Product Requirements Document (PRD)

## Target User

Job seekers who want tailored job applications without tedious manual writing.

## User Journey

1. User lands on the single-page interface.
2. User enters resume text (via direct paste or uploading a .txt/.md file) and job description.
3. User selects tone and optional company name.
4. User clicks "Generate Cover Letter".
5. Output generates into an editable textarea.
6. User copies or downloads the result.

## Functional Requirements

- Input validation: Resume and job description must contain at least 40
  characters and stay within the documented input limits.
- 3-Paragraph structure: Hook/interest, direct experience mapping, and closing call to action.
- Error handling for malformed requests, unavailable configuration, API
  failures, and API timeouts.
- Output actions: The generated letter can be edited, copied, or downloaded as
  a `.txt` file.
