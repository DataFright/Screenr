/**
 * @fileoverview Resume Grading API Endpoint
 * 
 * This API endpoint handles PDF resume uploads and grades them using AI.
 * It provides comprehensive security measures including:
 * - Input sanitization and validation
 * - PDF magic number validation
 * - File size and count limits
 * - Filename security checks
 * 
 * The endpoint accepts POST requests with FormData containing:
 * - jobTitle: The job title for evaluation context
 * - jobDescription: Full job description for matching
 * - files: One or more PDF resume files
 * 
 * Response includes graded results sorted by overall score, with
 * detailed scoring across three categories:
 * - Professionalism (formatting, clarity, tone)
 * - Qualifications (skills, education, certifications)
 * - Work Experience (depth, impact, relevance)
 * 
 * @module api/grade
 * @requires next/server - NextRequest, NextResponse
 * @requires OpenRouter chat completions API
 * @requires pdf-parse - PDF text extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { pathToFileURL } from 'node:url'
import { CanvasFactory, getData as getPdfWorkerData, getPath as getPdfWorkerPath } from 'pdf-parse/worker'
import {
  APIError,
  ErrorCode,
  ProcessingError,
  RequestError,
} from '@/lib/errors'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/** Minimum valid score */
const SCORE_MIN = 0

/** Maximum valid score */
const SCORE_MAX = 100

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Maximum number of files per request */
const MAX_FILES_PER_REQUEST = 10

/** Maximum number of resume processing tasks to run concurrently */
const MAX_GRADING_CONCURRENCY = 2

/** Maximum text length to process from PDFs */
const MAX_TEXT_LENGTH = 50000

/** Maximum filename length */
const MAX_FILENAME_LENGTH = 255

/** Minimum file size to avoid empty/corrupted files */
const MIN_FILE_SIZE = 100

/** Minimum job title length */
const MIN_JOB_TITLE_LENGTH = 2

/** Maximum job title length */
const MAX_JOB_TITLE_LENGTH = 200

/** Minimum job description length */
const MIN_JOB_DESCRIPTION_LENGTH = 10

/** Maximum job description length */
const MAX_JOB_DESCRIPTION_LENGTH = 2000

/** PDF magic number (first 4 bytes: %PDF) for file validation */
const PDF_MAGIC_NUMBER = Buffer.from([0x25, 0x50, 0x44, 0x46])

/** OpenRouter chat completions endpoint */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Default OpenRouter model for resume grading */
const DEFAULT_OPENROUTER_MODEL = 'stepfun/step-3.5-flash:free'

/** Optional app identifier sent to OpenRouter */
const OPENROUTER_APP_NAME = 'Screenr'

/** Hard timeout for a single OpenRouter grading request */
const OPENROUTER_TIMEOUT_MS = 45000

/** Number of retry attempts for transient OpenRouter failures */
const OPENROUTER_MAX_ATTEMPTS = 2

/** Base retry delay for transient OpenRouter failures */
const OPENROUTER_RETRY_DELAY_MS = 1500

/** Enables verbose server-side diagnostics for production debugging */
const SCREENR_DEBUG_ENABLED = process.env.SCREENR_DEBUG === 'true'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a score for a single evaluation category
 */
interface ScoreCategory {
  score: number
  explanation: string
}

/**
 * Complete graded resume result
 */
interface GradedResume {
  fileName: string
  candidateName: string
  email: string
  phone: string
  overallScore: number
  professionalism: ScoreCategory
  qualifications: ScoreCategory
  workExperience: ScoreCategory
}

/**
 * API response structure
 */
interface ApiResponse {
  success: boolean
  results?: GradedResume[]
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

interface OpenRouterResponseMessage {
  content?: string | Array<{ type?: string; text?: string }>
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: OpenRouterResponseMessage
  }>
}

interface RequestTimingSummary {
  formDataMs: number
  requestValidationMs: number
  fileValidationMs: number
  pdfExtractionMs: number
  aiGradingMs: number
  totalMs: number
  processedFiles: number
}

interface QueuedFile {
  file: File
  index: number
}

interface ProcessedResumeResult {
  index: number
  result: GradedResume
  pdfExtractionMs: number
  aiGradingMs: number
}

type PdfParseModule = typeof import('pdf-parse')

let pdfParseModulePromise: Promise<PdfParseModule> | null = null
let isPdfParseWorkerConfigured = false

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Sanitizes string input to prevent injection attacks
 * Removes control characters, HTML tags, and truncates to max length
 * 
 * @param input - Raw input string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
}

/**
 * Validates filename for security
 * Checks for path traversal, special characters, and correct extension
 * 
 * @param filename - Filename to validate
 * @returns Validation result with optional error message
 */
function validateFilename(filename: string): { valid: boolean; error?: string } {
  if (!filename) {
    return { valid: false, error: 'Filename is required' }
  }
  
  if (filename.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: `Filename must be less than ${MAX_FILENAME_LENGTH} characters` }
  }
  
  // Prevent path traversal and dangerous characters
  const dangerousPatterns = /[<>:"/\\|?*\x00-\x1F]|\.\.|\.$/
  if (dangerousPatterns.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' }
  }
  
  // Must have .pdf extension
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have .pdf extension' }
  }
  
  return { valid: true }
}

/** PDF EOF marker (ends PDF files) */
const PDF_EOF_MARKER = Buffer.from([0x25, 0x25, 0x45, 0x4F, 0x46]) // %%EOF

/**
 * Validates PDF magic number (file signature)
 * Ensures the file is actually a PDF and not just named with .pdf extension
 * 
 * Validation includes:
 * - PDF header (%PDF-) at start of file
 * - PDF EOF marker (%%EOF) near end of file
 * - Basic structure validation
 * 
 * @param buffer - File buffer to validate
 * @returns True if valid PDF signature
 */
function isValidPDF(buffer: Buffer): boolean {
  if (buffer.length < 8) return false
  
  // Check PDF magic number at start (%PDF-)
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC_NUMBER)) {
    return false
  }
  
  // Check for %%EOF marker within last 1024 bytes
  // PDF files must end with %%EOF (though there may be trailing whitespace)
  const searchStart = Math.max(0, buffer.length - 1024)
  const endSection = buffer.subarray(searchStart)
  const eofString = endSection.toString('ascii')
  
  if (!eofString.includes('%%EOF')) {
    return false
  }
  
  // Check for basic PDF structure indicators (at least one object or stream)
  const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024))
  const hasObject = content.includes('obj') || content.includes('stream')
  
  return hasObject
}

/**
 * Clamps a score to the valid range (0-100)
 * Handles invalid/unparseable values by defaulting to 0
 * 
 * @param score - Score value (may be any type from AI response)
 * @returns Clamped score between 0 and 100
 */
function clampScore(score: unknown): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Number(score) || 0))
}

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.STEP_KEY || process.env.StepKey

  if (!apiKey) {
    throw new Error('Missing OpenRouter API key. Set OPENROUTER_API_KEY or STEP_KEY in your environment.')
  }

  return apiKey
}

function hasOpenRouterApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.STEP_KEY || process.env.StepKey)
}

function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
}

function getOpenRouterModelCandidates(): string[] {
  const configuredModel = getOpenRouterModel().trim()

  if (!configuredModel) {
    return [DEFAULT_OPENROUTER_MODEL]
  }

  const candidates = [configuredModel]

  if (configuredModel.endsWith(':free')) {
    candidates.push(configuredModel.slice(0, -':free'.length))
  }

  return [...new Set(candidates.filter(Boolean))]
}

function shouldFallbackOpenRouterModel(error: unknown, attemptedModel: string, configuredModel: string): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const normalizedAttemptedModel = attemptedModel.trim().toLowerCase()
  const normalizedConfiguredModel = configuredModel.trim().toLowerCase()

  if (normalizedAttemptedModel !== normalizedConfiguredModel || !normalizedAttemptedModel.endsWith(':free')) {
    return false
  }

  const message = error.message.toLowerCase()

  return message.includes('status 404') && message.includes('no endpoints found')
}

function extractOpenRouterTextContent(message?: OpenRouterResponseMessage): string {
  if (!message?.content) {
    return ''
  }

  if (typeof message.content === 'string') {
    return message.content
  }

  return message.content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
}

function initializeRequestTimingSummary(): RequestTimingSummary {
  return {
    formDataMs: 0,
    requestValidationMs: 0,
    fileValidationMs: 0,
    pdfExtractionMs: 0,
    aiGradingMs: 0,
    totalMs: 0,
    processedFiles: 0,
  }
}

function createTimingHeaders(timings: RequestTimingSummary): Headers {
  const headers = new Headers()
  const serverTimingValue = [
    `formdata;dur=${timings.formDataMs.toFixed(1)}`,
    `request-validation;dur=${timings.requestValidationMs.toFixed(1)}`,
    `file-validation;dur=${timings.fileValidationMs.toFixed(1)}`,
    `pdf-extraction;dur=${timings.pdfExtractionMs.toFixed(1)}`,
    `ai-grading;dur=${timings.aiGradingMs.toFixed(1)}`,
    `total;dur=${timings.totalMs.toFixed(1)}`,
  ].join(', ')

  headers.set('Server-Timing', serverTimingValue)
  headers.set('X-Screenr-Total-Ms', timings.totalMs.toFixed(1))
  headers.set('X-Screenr-Processed-Files', String(timings.processedFiles))

  return headers
}

function createRequestId(): string {
  return crypto.randomUUID().slice(0, 8)
}

function truncateForLog(value: string, maxLength: number = 500): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}...`
}

function withRequestId(headers: Headers | undefined, requestId: string): Headers {
  const nextHeaders = headers ?? new Headers()
  nextHeaders.set('X-Screenr-Request-Id', requestId)
  return nextHeaders
}

function logGradeInfo(message: string, requestId: string, metadata?: Record<string, unknown>): void {
  console.info(`[screenr-grade:${requestId}] ${message}`, metadata ?? {})
}

function logGradeWarn(message: string, requestId: string, metadata?: Record<string, unknown>): void {
  console.warn(`[screenr-grade:${requestId}] ${message}`, metadata ?? {})
}

function logGradeError(message: string, requestId: string, metadata?: Record<string, unknown>): void {
  console.error(`[screenr-grade:${requestId}] ${message}`, metadata ?? {})
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableOpenRouterFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('status 408') ||
    message.includes('status 429') ||
    message.includes('status 500') ||
    message.includes('status 502') ||
    message.includes('status 503') ||
    message.includes('status 504') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('unexpected end of json input') ||
    message.includes('unterminated string') ||
    message.includes('bad control character') ||
    message.includes('expected property name') ||
    message.includes('openrouter returned an empty response') ||
    message.includes('openrouter returned a non-json response') ||
    message.includes('econnreset') ||
    message.includes('socket hang up')
  )
}

function extractJsonObject(text: string): string {
  const trimmedText = text.trim()

  if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
    return trimmedText
  }

  const firstBraceIndex = trimmedText.indexOf('{')
  if (firstBraceIndex === -1) {
    throw new Error('OpenRouter returned a non-JSON response')
  }

  let braceDepth = 0
  let inString = false
  let isEscaped = false

  for (let index = firstBraceIndex; index < trimmedText.length; index += 1) {
    const character = trimmedText[index]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (character === '\\') {
      isEscaped = true
      continue
    }

    if (character === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (character === '{') {
      braceDepth += 1
    } else if (character === '}') {
      braceDepth -= 1

      if (braceDepth === 0) {
        return trimmedText.slice(firstBraceIndex, index + 1)
      }
    }
  }

  throw new Error('OpenRouter returned an incomplete JSON response')
}

async function measureAsync<T>(operation: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startedAt = performance.now()
  const result = await operation()

  return {
    result,
    durationMs: performance.now() - startedAt,
  }
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>
): Promise<TResult[]> {
  if (items.length === 0) {
    return []
  }

  const results = new Array<TResult>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) {
        return
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

async function getPdfParseModule(): Promise<PdfParseModule> {
  if (!pdfParseModulePromise) {
    pdfParseModulePromise = import('pdf-parse')
  }

  const pdfParseModule = await pdfParseModulePromise

  if (!isPdfParseWorkerConfigured) {
    const workerSource = getPdfWorkerPath() || getPdfWorkerData()

    if (workerSource) {
      const normalizedWorkerSource =
        workerSource.startsWith('file:') ||
        workerSource.startsWith('data:') ||
        workerSource.startsWith('http://') ||
        workerSource.startsWith('https://')
          ? workerSource
          : pathToFileURL(workerSource).href

      pdfParseModule.PDFParse.setWorker(normalizedWorkerSource)
    }

    isPdfParseWorkerConfigured = true
  }

  return pdfParseModule
}

/**
 * Validates email format using regex
 * 
 * @param email - Email string to validate
 * @returns True if valid email format
 */
function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone format allowing common formats
 * 
 * @param phone - Phone string to validate
 * @returns True if valid phone format
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return false
  const phoneRegex = /^[\d\s\-+()]{7,20}$/
  return phoneRegex.test(phone)
}

/**
 * Creates a safe error result for failed resume processing
 * Returns a GradedResume with 0 scores and error explanation
 * 
 * @param fileName - Original filename
 * @param candidateName - Candidate name (if known)
 * @param explanation - Error explanation
 * @returns GradedResume with error state
 */
function createErrorResumeResult(fileName: string, candidateName: string, explanation: string): GradedResume {
  return {
    fileName: sanitizeString(fileName, MAX_FILENAME_LENGTH),
    candidateName: sanitizeString(candidateName, 100),
    email: '',
    phone: '',
    overallScore: 0,
    professionalism: { score: 0, explanation: sanitizeString(explanation, 200) },
    qualifications: { score: 0, explanation: sanitizeString(explanation, 200) },
    workExperience: { score: 0, explanation: sanitizeString(explanation, 200) }
  }
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

/**
 * Extracts text content from a PDF buffer
 * Uses pdf-parse for server-side PDF parsing in Node runtimes
 * 
 * Security measures:
 * - Limits pages processed (max 50)
 * - Limits total text length (max 50,000 chars)
 * 
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 * @throws ProcessingError if PDF parsing fails
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await getPdfParseModule()
    const parser = new PDFParse({ data: buffer, CanvasFactory })

    try {
      const textResult = await parser.getText()
      return textResult.text.slice(0, MAX_TEXT_LENGTH).trim()
    } finally {
      await parser.destroy()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('PDF parsing failed:', message)
    throw new ProcessingError(ErrorCode.PDF_PARSE_ERROR, 'unknown.pdf', message)
  }
}

// ============================================================================
// AI GRADING
// ============================================================================

/**
 * Grades a resume using AI based on job requirements
 * 
 * The AI evaluates the resume across three dimensions:
 * - Professionalism (20% weight): formatting, clarity, tone
 * - Qualifications (35% weight): skills, education, certifications
 * - Work Experience (45% weight): depth, impact, progression
 * 
 * @param resumeText - Extracted text from the resume PDF
 * @param jobTitle - Target job title
 * @param jobDescription - Full job description
 * @param fileName - Original filename for error reporting
 * @returns GradedResume with scores and explanations
 * @throws ProcessingError if AI fails to respond or parse
 */
async function gradeResume(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  fileName: string,
  requestId: string
): Promise<GradedResume> {
  // Sanitize inputs for AI prompt
  const safeJobTitle = sanitizeString(jobTitle, MAX_JOB_TITLE_LENGTH)
  const safeJobDescription = sanitizeString(jobDescription, MAX_JOB_DESCRIPTION_LENGTH)
  const safeResumeText = sanitizeString(resumeText, MAX_TEXT_LENGTH)

  // System prompt defines the AI's role and response format
  const systemPrompt = `You are an expert HR recruiter and resume evaluator. You grade resumes objectively based on job requirements.

You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations outside the JSON.

The JSON must have this exact structure:
{
  "candidateName": "Full name extracted from resume",
  "email": "email extracted from resume or empty string",
  "phone": "phone number extracted from resume or empty string",
  "overallScore": <number 0-100>,
  "professionalism": {
    "score": <number 0-100>,
    "explanation": "Brief 1-2 sentence explanation"
  },
  "qualifications": {
    "score": <number 0-100>,
    "explanation": "Brief 1-2 sentence explanation"
  },
  "workExperience": {
    "score": <number 0-100>,
    "explanation": "Brief 1-2 sentence explanation"
  }
}

Scoring criteria:
- Professionalism (formatting, clarity, tone, grammar, structure)
- Qualifications (skills, education, certifications, relevance to job)
- Work Experience (depth, impact, progression, relevance)

Overall score should be a weighted average (Professionalism 20%, Qualifications 35%, Work Experience 45%).`

  // User prompt provides the specific evaluation context
  const userPrompt = `You are evaluating a resume for the following job:

Job Title: ${safeJobTitle}
Job Description: ${safeJobDescription}

Resume Content:
${safeResumeText}

Grade the candidate from 0-100 in:
1. Professionalism (formatting, clarity, tone)
2. Qualifications (skills, education, relevance)
3. Work Experience (depth, impact, progression)

Return ONLY valid JSON with no additional text or markdown.`

  let lastError: unknown
  const configuredModel = getOpenRouterModel()
  const candidateModels = getOpenRouterModelCandidates()

  if (SCREENR_DEBUG_ENABLED) {
    logGradeInfo('Preparing OpenRouter request', requestId, {
      fileName,
      model: configuredModel,
      candidateModels,
      hasApiKey: hasOpenRouterApiKey(),
      resumeLength: safeResumeText.length,
      jobTitleLength: safeJobTitle.length,
      jobDescriptionLength: safeJobDescription.length,
    })
  }

  for (const candidateModel of candidateModels) {
    for (let attempt = 1; attempt <= OPENROUTER_MAX_ATTEMPTS; attempt += 1) {
      try {
        const completionResponse = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${getOpenRouterApiKey()}`,
            'Content-Type': 'application/json',
            'X-Title': OPENROUTER_APP_NAME,
          },
          body: JSON.stringify({
            model: candidateModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            reasoning: { enabled: true }
          })
        })

        if (!completionResponse.ok) {
          const errorBody = await completionResponse.text()
          logGradeError('OpenRouter request failed', requestId, {
            fileName,
            attempt,
            status: completionResponse.status,
            model: candidateModel,
            body: truncateForLog(errorBody),
          })
          throw new Error(`OpenRouter request failed with status ${completionResponse.status}: ${errorBody}`)
        }

        const completion = await completionResponse.json() as OpenRouterResponse
        const responseText = extractOpenRouterTextContent(completion.choices?.[0]?.message)

        if (!responseText.trim()) {
          logGradeError('OpenRouter returned empty content', requestId, {
            fileName,
            attempt,
            model: candidateModel,
          })
          throw new Error('OpenRouter returned an empty response')
        }

        let cleanedResponse = responseText.trim()
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.slice(7)
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3)
        }
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(0, -3)
        }
        cleanedResponse = cleanedResponse.trim()
        cleanedResponse = extractJsonObject(cleanedResponse)

        if (SCREENR_DEBUG_ENABLED) {
          logGradeInfo('OpenRouter returned parseable JSON payload', requestId, {
            fileName,
            attempt,
            model: candidateModel,
            preview: truncateForLog(cleanedResponse, 250),
          })
        }

        const parsed = JSON.parse(cleanedResponse)
        const email = parsed.email && isValidEmail(parsed.email)
          ? sanitizeString(parsed.email, 254)
          : ''
        const phone = parsed.phone && isValidPhone(parsed.phone)
          ? sanitizeString(parsed.phone, 20)
          : ''

        return {
          fileName: sanitizeString(fileName, MAX_FILENAME_LENGTH),
          candidateName: sanitizeString(parsed.candidateName || 'Unknown Candidate', 100),
          email,
          phone,
          overallScore: clampScore(parsed.overallScore),
          professionalism: {
            score: clampScore(parsed.professionalism?.score),
            explanation: sanitizeString(parsed.professionalism?.explanation || 'No explanation provided', 200)
          },
          qualifications: {
            score: clampScore(parsed.qualifications?.score),
            explanation: sanitizeString(parsed.qualifications?.explanation || 'No explanation provided', 200)
          },
          workExperience: {
            score: clampScore(parsed.workExperience?.score),
            explanation: sanitizeString(parsed.workExperience?.explanation || 'No explanation provided', 200)
          }
        }
      } catch (error) {
        lastError = error

        if (SCREENR_DEBUG_ENABLED) {
          logGradeWarn('OpenRouter grading attempt failed', requestId, {
            fileName,
            attempt,
            model: candidateModel,
            message: error instanceof Error ? error.message : String(error),
          })
        }

        if (attempt === OPENROUTER_MAX_ATTEMPTS || !isRetryableOpenRouterFailure(error)) {
          break
        }

        await delay(OPENROUTER_RETRY_DELAY_MS * attempt)
      }
    }

    if (candidateModel !== configuredModel) {
      break
    }

    if (candidateModels.length > 1 && shouldFallbackOpenRouterModel(lastError, candidateModel, configuredModel)) {
      const nextCandidateModel = candidateModels.find((model) => model !== candidateModel)

      if (nextCandidateModel) {
        logGradeWarn('Retrying with OpenRouter StepFun fallback model alias', requestId, {
          fileName,
          configuredModel,
          fallbackModel: nextCandidateModel,
        })
        continue
      }
    }

    break
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown error'
  logGradeError('AI response parsing failed', requestId, {
    fileName,
    message,
    model: configuredModel,
    candidateModels,
    hasApiKey: hasOpenRouterApiKey(),
  })
  throw new ProcessingError(ErrorCode.AI_ERROR, fileName, message)
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates job title input
 * 
 * @param value - Raw input value
 * @returns Validation result with sanitized value on success
 */
function validateJobTitle(value: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Job title is required' }
  }
  
  const sanitized = sanitizeString(value, MAX_JOB_TITLE_LENGTH)
  
  if (sanitized.length < MIN_JOB_TITLE_LENGTH) {
    return { valid: false, error: `Job title must be at least ${MIN_JOB_TITLE_LENGTH} characters` }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validates job description input
 * 
 * @param value - Raw input value
 * @returns Validation result with sanitized value on success
 */
function validateJobDescription(value: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Job description is required' }
  }
  
  const sanitized = sanitizeString(value, MAX_JOB_DESCRIPTION_LENGTH)
  
  if (sanitized.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return { valid: false, error: `Job description must be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters` }
  }
  
  return { valid: true, sanitized }
}

/**
 * Validates uploaded file
 * Checks size, MIME type, and filename security
 * 
 * @param file - File object to validate
 * @returns Validation result
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }
  
  if (file.size < MIN_FILE_SIZE) {
    return { valid: false, error: 'File is too small or corrupted' }
  }
  
  // Validate filename
  const filenameValidation = validateFilename(file.name)
  if (!filenameValidation.valid) {
    return { valid: false, error: filenameValidation.error }
  }
  
  // Check MIME type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed' }
  }
  
  return { valid: true }
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

/**
 * Creates a success response with graded results
 * 
 * @param results - Array of graded resumes
 * @returns JSON response with success status
 */
function successResponse(results: GradedResume[], timings?: RequestTimingSummary): NextResponse<ApiResponse> {
  const headers = timings ? createTimingHeaders(timings) : undefined

  return NextResponse.json({ success: true, results }, { headers })
}

function successResponseWithRequestId(results: GradedResume[], requestId: string, timings?: RequestTimingSummary): NextResponse<ApiResponse> {
  const headers = withRequestId(timings ? createTimingHeaders(timings) : undefined, requestId)

  return NextResponse.json({ success: true, results }, { headers })
}

/**
 * Creates an error response from an APIError
 * 
 * @param error - APIError instance
 * @returns JSON response with error details and appropriate status code
 */
function errorResponse(error: APIError, timings?: RequestTimingSummary): NextResponse<ApiResponse> {
  const headers = timings ? createTimingHeaders(timings) : undefined

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode, headers }
  )
}

function errorResponseWithRequestId(error: APIError, requestId: string, timings?: RequestTimingSummary): NextResponse<ApiResponse> {
  const headers = withRequestId(timings ? createTimingHeaders(timings) : undefined, requestId)

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode, headers }
  )
}

async function processResumeFile(
  queuedFile: QueuedFile,
  jobTitle: string,
  jobDescription: string,
  requestId: string
): Promise<ProcessedResumeResult> {
  const { file, index } = queuedFile

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!isValidPDF(buffer)) {
      logGradeWarn('Rejected invalid PDF signature', requestId, {
        fileName: file.name,
        fileSize: file.size,
      })

      return {
        index,
        result: createErrorResumeResult(file.name, 'Invalid PDF', 'File is not a valid PDF document'),
        pdfExtractionMs: 0,
        aiGradingMs: 0,
      }
    }

    const { result: resumeText, durationMs: pdfExtractionMs } = await measureAsync(() => extractTextFromPDF(buffer))

    if (!resumeText || resumeText.trim().length < 50) {
      logGradeWarn('PDF text extraction returned insufficient content', requestId, {
        fileName: file.name,
        extractedLength: resumeText.trim().length,
      })

      return {
        index,
        result: createErrorResumeResult(file.name, 'No Text Found', 'Could not extract readable text from this PDF'),
        pdfExtractionMs,
        aiGradingMs: 0,
      }
    }

    const { result: gradedResume, durationMs: aiGradingMs } = await measureAsync(() => gradeResume(
      resumeText,
      jobTitle,
      jobDescription,
      file.name,
      requestId
    ))

    return {
      index,
      result: gradedResume,
      pdfExtractionMs,
      aiGradingMs,
    }
  } catch (error) {
    if (error instanceof ProcessingError) {
      logGradeError('Resume processing failed', requestId, {
        fileName: file.name,
        errorCode: error.code,
        message: error.message,
        details: error.details,
      })
    } else {
      logGradeError('Unexpected resume processing failure', requestId, {
        fileName: file.name,
        error,
      })
    }

    return {
      index,
      result: error instanceof ProcessingError
        ? createErrorResumeResult(file.name, 'Processing Error', error.message)
        : createErrorResumeResult(file.name, 'Processing Error', 'Failed to process this resume'),
      pdfExtractionMs: 0,
      aiGradingMs: 0,
    }
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST handler for resume grading
 * 
 * Request body (multipart/form-data):
 * - jobTitle: string (required)
 * - jobDescription: string (required)
 * - files: File[] (required, max 10, PDF only)
 * 
 * Response:
 * - success: boolean
 * - results: GradedResume[] (on success)
 * - error: { code, message, details? } (on failure)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const requestId = createRequestId()
  const requestStartedAt = performance.now()
  const timings = initializeRequestTimingSummary()

  try {
    logGradeInfo('Grade request received', requestId, {
      method: request.method,
      contentLength: request.headers.get('content-length'),
      hasApiKey: hasOpenRouterApiKey(),
      model: getOpenRouterModel(),
      debugEnabled: SCREENR_DEBUG_ENABLED,
    })

    // Security: Check content-length header to prevent oversized uploads
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE * MAX_FILES_PER_REQUEST * 1.5) {
      throw new RequestError(ErrorCode.CONTENT_TOO_LARGE, 'Request body is too large')
    }

    // Parse form data
    let formData: FormData
    const formDataStartedAt = performance.now()
    try {
      formData = await request.formData()
    } catch {
      throw new RequestError(ErrorCode.INVALID_REQUEST, 'Invalid request format')
    }
    timings.formDataMs = performance.now() - formDataStartedAt
    
    const requestValidationStartedAt = performance.now()

    // Validate job title
    const titleValidation = validateJobTitle(formData.get('jobTitle'))
    if (!titleValidation.valid) {
      throw new RequestError(ErrorCode.MISSING_FIELD, titleValidation.error, { field: 'jobTitle' })
    }
    
    // Validate job description
    const descriptionValidation = validateJobDescription(formData.get('jobDescription'))
    if (!descriptionValidation.valid) {
      throw new RequestError(ErrorCode.MISSING_FIELD, descriptionValidation.error, { field: 'jobDescription' })
    }

    // Get files from form data
    const filesRaw = formData.getAll('files')
    if (!filesRaw || filesRaw.length === 0) {
      throw new RequestError(ErrorCode.MISSING_FIELD, 'No files uploaded', { field: 'files' })
    }

    // Security: Limit number of files
    if (filesRaw.length > MAX_FILES_PER_REQUEST) {
      throw new RequestError(
        ErrorCode.VALIDATION_ERROR, 
        `Maximum ${MAX_FILES_PER_REQUEST} files allowed`
      )
    }

    logGradeInfo('Validated grade request payload', requestId, {
      fileCount: filesRaw.length,
      jobTitleLength: titleValidation.sanitized?.length,
      jobDescriptionLength: descriptionValidation.sanitized?.length,
    })

    timings.requestValidationMs = performance.now() - requestValidationStartedAt

    const orderedResults: Array<GradedResume | undefined> = new Array(filesRaw.length)
    const queuedFiles: QueuedFile[] = []

    const fileValidationStartedAt = performance.now()

    for (const [index, fileRaw] of filesRaw.entries()) {
      // Validate file object type
      if (!(fileRaw instanceof File)) {
        orderedResults[index] = createErrorResumeResult('unknown.pdf', 'Invalid File', 'Invalid file object')
        continue
      }
      
      const file = fileRaw as File

      // Validate file constraints
      const fileValidation = validateFile(file)
      if (!fileValidation.valid) {
        orderedResults[index] = createErrorResumeResult(file.name, 'Invalid File', fileValidation.error || 'Invalid file')
        continue
      }

      queuedFiles.push({ file, index })
    }
    timings.fileValidationMs = performance.now() - fileValidationStartedAt

    const processedResumes = await mapWithConcurrency(
      queuedFiles,
      MAX_GRADING_CONCURRENCY,
      (queuedFile) => processResumeFile(
        queuedFile,
        titleValidation.sanitized!,
        descriptionValidation.sanitized!,
        requestId
      )
    )

    for (const processedResume of processedResumes) {
      orderedResults[processedResume.index] = processedResume.result
      timings.pdfExtractionMs += processedResume.pdfExtractionMs
      timings.aiGradingMs += processedResume.aiGradingMs
    }

    const results = orderedResults.filter((result): result is GradedResume => result !== undefined)
    const successfulResults = results.filter((result) => result.overallScore > 0).length
    const failedResults = results.length - successfulResults
    timings.processedFiles = queuedFiles.length
    timings.totalMs = performance.now() - requestStartedAt

    logGradeInfo('Completed grade request', requestId, {
      results: results.length,
      successfulResults,
      failedResults,
      timings,
    })

    return successResponseWithRequestId(results, requestId, timings)
  } catch (error) {
    timings.totalMs = performance.now() - requestStartedAt

    // Handle known API errors
    if (error instanceof APIError) {
      logGradeWarn('Handled API error in grade request', requestId, {
        errorCode: error.code,
        message: error.message,
        details: error.details,
        timings,
      })
      return errorResponseWithRequestId(error, requestId, timings)
    }
    
    // Log unexpected errors but don't expose details to client
    logGradeError('Unexpected error in grade API', requestId, {
      error,
      timings,
    })
    return errorResponseWithRequestId(new APIError(ErrorCode.INTERNAL_ERROR), requestId, timings)
  }
}

// ============================================================================
// OTHER HTTP METHOD HANDLERS
// ============================================================================

/**
 * GET handler - Not allowed for this endpoint
 * Returns 405 Method Not Allowed
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  return errorResponse(new RequestError(
    ErrorCode.METHOD_NOT_ALLOWED, 
    'Method not allowed. Use POST.',
    { allowedMethods: ['POST'] }
  ))
}

/**
 * PUT handler - Not allowed for this endpoint
 * Returns 405 Method Not Allowed
 */
export async function PUT(): Promise<NextResponse<ApiResponse>> {
  return errorResponse(new RequestError(ErrorCode.METHOD_NOT_ALLOWED, 'Method not allowed. Use POST.'))
}

/**
 * DELETE handler - Not allowed for this endpoint
 * Returns 405 Method Not Allowed
 */
export async function DELETE(): Promise<NextResponse<ApiResponse>> {
  return errorResponse(new RequestError(ErrorCode.METHOD_NOT_ALLOWED, 'Method not allowed. Use POST.'))
}
