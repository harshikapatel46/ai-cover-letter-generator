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

/**
 * Normalizes raw LLM output into exactly 3 standard paragraphs
 * while preserving greeting and sign-off gracefully.
 */
function normalizeToThreeParagraphs(rawText: string, targetCompany: string): string {
  let text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/```(?:markdown|text)?\n?/gi, "")
    .replace(/```/g, "")
    .trim();

  // Remove meta commentary or labels like "Paragraph 1:"
  text = text.replace(/^(here is|certainly|sure)[^\n]*\n+/i, "").trim();
  text = text.replace(/\*\*(?:Paragraph|Body)\s*\d+:\*\*\s*/gi, "");
  text = text.replace(/(?:Paragraph|Body)\s*\d+:\s*/gi, "");

  let chunks = text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);

  // Filter out any contact header chunks and address blocks before the salutation
  const dearIndex = chunks.findIndex((c) => /^dear\b/i.test(c));
  if (dearIndex > 0) {
    chunks = chunks.slice(dearIndex);
  } else {
    chunks = chunks.filter((c) => {
      if (c.length < 150 && /\[your (name|email|phone|address|linkedin|city)\]/i.test(c)) return false;
      if (c.length < 150 && /\[(city|state|zip|phone|email|linkedin|date|company name|company address)\]/i.test(c)) return false;
      if (c.length < 60 && /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[A-Z][a-z]+ \d{1,2},? \d{4})$/.test(c)) return false;
      return true;
    });
  }

  // Extract leading greeting (e.g. "Dear ...")
  let greeting = "";
  if (chunks.length > 0 && /^dear\b/i.test(chunks[0]) && chunks[0].length < 120) {
    greeting = chunks.shift()!;
  }

  // Extract trailing sign-off (e.g. "Sincerely, ...")
  let signOff = "";
  while (chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    if (
      /^(sincerely|best regards|warm regards|regards|respectfully|thank you|thanks)/i.test(last) ||
      last.length < 50 ||
      /\[your name\]/i.test(last)
    ) {
      signOff = chunks.pop() + (signOff ? "\n" + signOff : "");
    } else {
      break;
    }
  }

  // Ensure exactly 3 substantive body paragraphs
  let p1 = "";
  let p2 = "";
  let p3 = "";

  if (chunks.length === 3) {
    [p1, p2, p3] = chunks;
  } else if (chunks.length > 3) {
    p1 = chunks[0];
    if (chunks.length === 4) {
      p2 = chunks[1] + " " + chunks[2];
      p3 = chunks[3];
    } else {
      const third = Math.floor(chunks.length / 3);
      p1 = chunks.slice(0, third).join(" ");
      p2 = chunks.slice(third, third * 2).join(" ");
      p3 = chunks.slice(third * 2).join(" ");
    }
  } else if (chunks.length === 2) {
    if (chunks[1].length > chunks[0].length) {
      p1 = chunks[0];
      const sentences = chunks[1].match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [chunks[1]];
      const mid = Math.max(1, Math.floor(sentences.length / 2));
      p2 = sentences.slice(0, mid).join("").trim();
      p3 = sentences.slice(mid).join("").trim() || p2;
    } else {
      const sentences = chunks[0].match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [chunks[0]];
      const mid = Math.max(1, Math.floor(sentences.length / 2));
      p1 = sentences.slice(0, mid).join("").trim();
      p2 = sentences.slice(mid).join("").trim() || p1;
      p3 = chunks[1];
    }
  } else if (chunks.length === 1) {
    const sentences = chunks[0].match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [chunks[0]];
    if (sentences.length >= 3) {
      const third = Math.ceil(sentences.length / 3);
      p1 = sentences.slice(0, third).join("").trim();
      p2 = sentences.slice(third, third * 2).join("").trim();
      p3 = sentences.slice(third * 2).join("").trim();
    } else {
      p1 = sentences[0]?.trim() || chunks[0];
      p2 =
        sentences[1]?.trim() ||
        "My background and technical experience directly address the key requirements of this role.";
      p3 =
        sentences[2]?.trim() ||
        "I welcome the opportunity to discuss my qualifications in an interview. Thank you for your consideration.";
    }
  } else {
    p1 = `I am writing to express my enthusiastic interest in joining ${targetCompany}.`;
    p2 = `My proven background directly matches your requirements.`;
    p3 = `I welcome the opportunity to discuss how I can contribute to your team.`;
  }

  // Format greeting into paragraph 1 using a single newline so it's a cohesive first paragraph
  const finalGreeting = greeting || `Dear ${targetCompany} Hiring Team,`;
  if (!p1.toLowerCase().startsWith("dear")) {
    p1 = `${finalGreeting}\n${p1}`;
  }

  // Format sign-off into paragraph 3 using single newlines
  const finalSignOff = signOff || `Sincerely,\n[Your Name]`;
  if (!p3.toLowerCase().includes("sincerely")) {
    p3 = `${p3}\n${finalSignOff}`;
  } else {
    // Ensure any internal double newline before "Sincerely" is a single newline
    p3 = p3.replace(/\n\s*\n\s*(sincerely|best regards|warm regards|regards|thank you)/i, "\n$1");
  }

  return `${p1}\n\n${p2}\n\n${p3}`;
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
- Output exactly 3 substantive paragraphs, separated by one blank line.
- Do not use markdown, bullet points, headings, labels, or code fences.
- Paragraph 1: State interest in the specific role at ${targetCompany} and explain the candidate's enthusiasm and alignment.
- Paragraph 2: Directly map at least 2 specific resume achievements or metrics to the job requirements.
- Paragraph 3: Summarize the fit, thank the reader, and include a clear interview call to action.
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
              maxOutputTokens: 1500,
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
    const rawCoverLetter = await Promise.race([generation, timeout]);
    const coverLetter = normalizeToThreeParagraphs(rawCoverLetter, targetCompany);
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
