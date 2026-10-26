import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MIN_INPUT_LENGTH = 40;
const MAX_RESUME_LENGTH = 12_000;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_COMPANY_NAME_LENGTH = 120;
const GENERATION_TIMEOUT_MS = 30_000;
const SUPPORTED_TONES = ["Professional", "Modern", "Executive"] as const;
const apiKey = process.env.GEMINI_API_KEY?.trim();
const modelCandidates = Array.from(
  new Set([
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ]),
);

type GenerateRequest = {
  resume?: unknown;
  jobDescription?: unknown;
  companyName?: unknown;
  tone?: unknown;
};

function isSupportedTone(
  value: unknown,
): value is (typeof SUPPORTED_TONES)[number] {
  return (
    typeof value === "string" &&
    SUPPORTED_TONES.includes(value as (typeof SUPPORTED_TONES)[number])
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown generation error";
}

function validateInputLength(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (value.length < minimum) {
    return `${label} must be at least ${minimum} characters.`;
  }
  if (value.length > maximum) {
    return `${label} must be ${maximum} characters or fewer.`;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let body: GenerateRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const { resume, jobDescription, companyName, tone } = body;

    if (typeof resume !== "string" || !resume.trim()) {
      return NextResponse.json(
        { error: "Resume text is required." },
        { status: 400 },
      );
    }

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json(
        { error: "Job description is required." },
        { status: 400 },
      );
    }

    const trimmedResume = resume.trim();
    const trimmedJobDescription = jobDescription.trim();
    const resumeLengthError = validateInputLength(
      trimmedResume,
      "Resume text",
      MIN_INPUT_LENGTH,
      MAX_RESUME_LENGTH,
    );
    if (resumeLengthError) {
      return NextResponse.json({ error: resumeLengthError }, { status: 400 });
    }

    const jobLengthError = validateInputLength(
      trimmedJobDescription,
      "Job description",
      MIN_INPUT_LENGTH,
      MAX_JOB_DESCRIPTION_LENGTH,
    );
    if (jobLengthError) {
      return NextResponse.json({ error: jobLengthError }, { status: 400 });
    }

    if (companyName !== undefined && typeof companyName !== "string") {
      return NextResponse.json(
        { error: "Company name must be text." },
        { status: 400 },
      );
    }

    if (
      typeof companyName === "string" &&
      companyName.trim().length > MAX_COMPANY_NAME_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Company name must be ${MAX_COMPANY_NAME_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
    }

    if (tone !== undefined && !isSupportedTone(tone)) {
      return NextResponse.json(
        { error: "Tone must be Professional, Modern, or Executive." },
        { status: 400 },
      );
    }

    if (!apiKey || apiKey === "your_actual_api_key_here") {
      return NextResponse.json(
        {
          error:
            "Google Gemini API key is not configured. Please set a valid GEMINI_API_KEY in your .env.local file.",
        },
        { status: 500 },
      );
    }

    const selectedTone = isSupportedTone(tone) ? tone : "Professional";
    const targetCompany =
      typeof companyName === "string" && companyName.trim()
        ? companyName.trim()
        : "the hiring team";

    const systemPrompt = `You are a professional cover letter writer. Generate a concise, tailored cover letter based strictly on the candidate's resume and target job description.

Tone: ${selectedTone}
Company target: ${targetCompany}

Rules:
- Output exactly 3 paragraphs, separated by one blank line.
- Do not use markdown, bullet points, headings, labels, or code fences.
- Paragraph 1 should name the target role and explain the candidate's interest and alignment.
- Paragraph 2 should map at least 2 specific resume achievements or metrics to job requirements.
- Paragraph 3 should summarize the fit, thank the reader, and include a clear interview call to action.
- Include "Sincerely," and "[Your Name]" at the end of paragraph 3.`;

    const userPrompt = `TARGET COMPANY: ${targetCompany}
TARGET TONE: ${selectedTone}

JOB DESCRIPTION:
${trimmedJobDescription}

CANDIDATE RESUME / EXPERIENCE:
${trimmedResume}`;

    const googleGenAI = new GoogleGenAI({ apiKey });
    const generation = (async () => {
      let lastError: unknown;

      for (const model of modelCandidates) {
        try {
          const response = await googleGenAI.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.6,
              maxOutputTokens: 800,
            },
          });
          const text = response.text
            ?.replace(/\r\n/g, "\n")
            .replace(/```(?:markdown|text)?\n?/gi, "")
            .trim();

          if (text) {
            return text;
          }
        } catch (error: unknown) {
          lastError = error;
          console.warn(`Gemini model ${model} failed; trying the next model.`);
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("All configured Gemini models failed.");
    })();

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("GENERATION_TIMEOUT")),
        GENERATION_TIMEOUT_MS,
      );
    });
    const coverLetter = await Promise.race([generation, timeout]);
    const paragraphs = coverLetter.split(/\n\s*\n/).filter(Boolean);

    if (paragraphs.length !== 3) {
      return NextResponse.json(
        {
          error:
            "The generated letter did not have the expected three-paragraph format. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ coverLetter });
  } catch (error: unknown) {
    console.error("Cover letter generation error:", error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage === "GENERATION_TIMEOUT") {
      return NextResponse.json(
        { error: "Generation timed out. Please try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate cover letter. Please try again." },
      { status: 500 },
    );
  }
}
