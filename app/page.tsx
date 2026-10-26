"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  Building2,
  Briefcase,
  FileText,
  RotateCcw,
} from "lucide-react";

const MIN_INPUT_LENGTH = 40;
const MAX_RESUME_LENGTH = 12_000;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const GENERATION_TIMEOUT_MS = 35_000;

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [tone, setTone] = useState("Professional");
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setErrorMessage(null);

    // Validation checks
    const trimmedResume = resume.trim();
    const trimmedJob = jobDescription.trim();

    if (!trimmedJob && !trimmedResume) {
      setErrorMessage(
        "Please provide both your target job description and your resume text.",
      );
      return;
    }
    if (!trimmedJob) {
      setErrorMessage(
        "Please enter the target job description to tailor the cover letter.",
      );
      return;
    }
    if (!trimmedResume) {
      setErrorMessage(
        "Please enter your resume experience so we can map your achievements.",
      );
      return;
    }
    if (trimmedJob.length < MIN_INPUT_LENGTH) {
      setErrorMessage(
        `Please enter at least ${MIN_INPUT_LENGTH} characters for the job description.`,
      );
      return;
    }
    if (trimmedResume.length < MIN_INPUT_LENGTH) {
      setErrorMessage(
        `Please enter at least ${MIN_INPUT_LENGTH} characters for your resume.`,
      );
      return;
    }
    if (trimmedJob.length > MAX_JOB_DESCRIPTION_LENGTH) {
      setErrorMessage(
        `Please keep the job description to ${MAX_JOB_DESCRIPTION_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (trimmedResume.length > MAX_RESUME_LENGTH) {
      setErrorMessage(
        `Please keep the resume to ${MAX_RESUME_LENGTH} characters or fewer.`,
      );
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      GENERATION_TIMEOUT_MS,
    );
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resume: trimmedResume,
          jobDescription: trimmedJob,
          companyName: companyName.trim(),
          tone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(
          data.error || `Request failed with status ${res.status}`,
        );
      }

      setOutput(data.coverLetter || "");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage("Generation timed out. Please try again.");
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to generate cover letter. Please try again in a few moments.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = output;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!output.trim()) return;
    const cleanCompany = companyName.trim()
      ? companyName.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
      : "Company";
    const filename = `${cleanCompany}_Cover_Letter.txt`;

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadSampleData = () => {
    setCompanyName("Stripe");
    setTone("Modern");
    setJobDescription(
      `Full-Stack Software Engineer (Payments Platform)
Responsibilities:
- Architect and scale low-latency payment processing APIs handling millions of daily transactions.
- Partner with product managers and cross-functional teams to deliver frictionless checkout experiences.
- Maintain high system reliability, observability, and robust automated test suites.
Requirements:
- 3+ years experience building web applications with Next.js, React, and TypeScript.
- Strong track record of optimizing database queries and backend API throughput.
- Passion for developer velocity, automated testing, and thoughtful system design.`,
    );
    setResume(
      `Senior Frontend / Full-Stack Engineer
- Spearheaded migration of core payments dashboard to Next.js App Router, boosting page load speeds by 42% and increasing conversion rates by 8%.
- Designed resilient GraphQL and REST APIs handling 5,000+ requests per minute with 99.98% uptime.
- Mentored 4 junior engineers, led code reviews, and implemented end-to-end integration test suites using Playwright.
- Skills: TypeScript, React, Next.js, Node.js, Tailwind CSS, PostgreSQL, Docker, Redis.`,
    );
    setErrorMessage(null);
  };

  const handleReset = () => {
    setCompanyName("");
    setJobDescription("");
    setResume("");
    setOutput("");
    setErrorMessage(null);
  };

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Career Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            One-Click Tailored Cover Letter Generator
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
            Paste your resume and target job description to get a focused,
            3-paragraph tailored cover letter mapping your real wins to what the
            team is looking for.
          </p>
        </header>

        {/* Graceful Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl transition-all shadow-xs"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">
                  Action Required
                </h3>
                <p className="text-sm text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 transition p-1 rounded-md"
              aria-label="Dismiss error banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main 2-Column Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Form & Inputs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                1. Job Details & Resume
              </h2>
              <button
                type="button"
                onClick={loadSampleData}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Load Sample
              </button>
            </div>

            {/* Inputs: Company & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="company-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Company Name{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="company-input"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="tone-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Tone of Voice
                </label>
                <select
                  id="tone-select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="Professional">
                    Professional (Polished & Corporate)
                  </option>
                  <option value="Modern">Modern (Dynamic & Startup)</option>
                  <option value="Executive">
                    Executive (Visionary & Strategic)
                  </option>
                </select>
              </div>
            </div>

            {/* Job Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="job-description-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Job Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {jobDescription.length}/{MAX_JOB_DESCRIPTION_LENGTH} characters
                </span>
              </div>
              <textarea
                id="job-description-input"
                rows={5}
                placeholder="Paste key responsibilities, role expectations, and tech stack requirements..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y"
              />
            </div>

            {/* Resume Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="resume-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Your Resume / Achievements{" "}
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                {resume.length}/{MAX_RESUME_LENGTH} characters
                </span>
              </div>
              <textarea
                id="resume-input"
                rows={7}
                placeholder="Paste your past roles, bullet points with measurable impact, and core skills..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                maxLength={MAX_RESUME_LENGTH}
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Tailored Letter...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Cover Letter</span>
                  </>
                )}
              </button>

              {(jobDescription || resume || companyName || output) && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset form"
                  className="p-3 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Tailored Output */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-145">
            {/* Output Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  2. Tailored Output
                </h2>
              </div>

              {output && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700 font-semibold">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              )}
            </div>

            {/* Output Body */}
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3 bg-slate-50/50">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Crafting your tailored 3-paragraph cover letter...
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Mapping your verified resume achievements directly to the
                      job requirements.
                    </p>
                  </div>
                </div>
              ) : output ? (
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Directly editable before copying or downloading</span>
                    <span>{wordCount} words</span>
                  </div>
                  <textarea
                    value={output}
                    onChange={(e) => setOutput(e.target.value)}
                    className="w-full flex-1 min-h-115 p-4 text-sm text-slate-800 border border-slate-200 rounded-xl leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition resize-y font-sans"
                    placeholder="Your cover letter will appear here..."
                  />
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">
                      Your customized cover letter will appear here
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Fill in the job description and your resume bullets on the
                      left, then click &quot;Generate Cover Letter&quot;.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-left space-y-1 max-w-xs">
                    <div className="font-semibold text-slate-500">
                      Output features:
                    </div>
                    <div>• 3 concise, high-impact paragraphs</div>
                    <div>• Direct mapping of resume wins to job specs</div>
                    <div>• One-click export to clipboard or .txt</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
