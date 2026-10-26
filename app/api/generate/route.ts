import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MIN_INPUT_LENGTH = 40;
const MAX_RESUME_LENGTH = 12_000;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_COMPANY_NAME_LENGTH = 120;
const SUPPORTED_TONES = ["Professional", "Modern", "Executive"] as const;
const apiKey = process.env.GEMINI_API_KEY?.trim();

type GenerateRequest = {
  resume?: unknown;
  jobDescription?: unknown;
  companyName?: unknown;
  tone?: unknown;
};

function isSupportedTone(value: unknown): value is (typeof SUPPORTED_TONES)[number] {
  return (
    typeof value === "string" &&
    SUPPORTED_TONES.includes(value as (typeof SUPPORTED_TONES)[number])
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown generation error";
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

    if (
      !jobDescription ||
      typeof jobDescription !== "string" ||
      !jobDescription.trim()
    ) {
      return NextResponse.json(
        { error: "Job description is required." },
        { status: 400 },
      );
    }

    const trimmedResume = resume.trim();
    const trimmedJobDescription = jobDescription.trim();

    if (trimmedResume.length < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Resume text must be at least ${MIN_INPUT_LENGTH} characters.` },
        { status: 400 },
      );
    }

    if (trimmedJobDescription.length < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        {
          error: `Job description must be at least ${MIN_INPUT_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    if (trimmedResume.length > MAX_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `Resume text must be ${MAX_RESUME_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    if (trimmedJobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          error: `Job description must be ${MAX_JOB_DESCRIPTION_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
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

    const systemPrompt = `You are an elite career coach and executive resume writer. 
Generate a compelling, concise, and tailored 3-paragraph cover letter based strictly on the candidate's resume and target job description.

Tone: ${selectedTone}
Company Target: ${targetCompany}

Guidelines:
- Output ONLY the cover letter body as exactly 3 paragraphs.
- Separate the 3 paragraphs with one completely blank line (two newline characters).
- Do not put the entire letter on one line, and do not use bullet points, headings, labels, or markdown.
- Paragraph 1: An engaging hook stating interest in the specific role at ${targetCompany}, conveying genuine enthusiasm and immediate alignment with their mission or needs.
- Paragraph 2: Direct evidence of value. Map at least 2 specific achievements or metrics from the resume directly to core requirements stated in the job description.
- Paragraph 3: A confident, professional closing summarizing mutual fit, thanking the reader, and including a clear call to action for an interview.`;

    const userPrompt = `TARGET COMPANY: ${targetCompany}
TONE: ${selectedTone}

JOB DESCRIPTION:
${trimmedJobDescription}

CANDIDATE RESUME / EXPERIENCE:
${trimmedResume}`;

    const googleGenAI = new GoogleGenAI({ apiKey });
    const generation = googleGenAI.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          maxOutputTokens: 600,
        },
      });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("GENERATION_TIMEOUT")), 30_000);
    });
    const response = await Promise.race([generation, timeout]);

    const coverLetter = response.text
      ?.replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();

    if (!coverLetter) {
      return NextResponse.json(
        { error: "LLM returned an empty response. Please try again." },
        { status: 500 },
      );
    }

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
  } catch (err: unknown) {
    console.error("Cover letter generation error:", err);

    const errorMessage = getErrorMessage(err);
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
