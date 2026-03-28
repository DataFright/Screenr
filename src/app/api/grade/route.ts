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
 * @requires z-ai-web-dev-sdk - AI completion API
 * @requires pdfjs-dist - PDF text extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import {
  APIError,
  ErrorCode,
  ProcessingError,
  RequestError,
} from '@/lib/errors'

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
 * Uses pdfjs-dist library for server-side PDF parsing
 * 
 * Security measures:
 * - Limits pages processed (max 50)
 * - Limits total text length (max 50,000 chars)
 * 
 * Memory optimization:
 * - Cleans up page resources after processing
 * - Uses Uint8Array view instead of copying data
 * - Early termination on text limit
 * 
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 * @throws ProcessingError if PDF parsing fails
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let pdf: Awaited<ReturnType<typeof import('pdfjs-dist/legacy/build/pdf.mjs').getDocument>>['promise'] | null = null
  
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0,
      isEvalSupported: false,
      useWorkerFetch: false,
      useSystemFonts: true,
    })
    
    pdf = await loadingTask.promise
    
    // Security: limit number of pages to process
    const maxPages = Math.min(pdf.numPages, 50)
    
    let fullText = ''
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      
      try {
        const textContent = await page.getTextContent()
        // Extract text from TextItem objects (filter out TextMarkedContent)
        const pageText = textContent.items
          .filter((item) => 'str' in item && typeof item.str === 'string')
          .map((item) => (item as { str: string }).str)
          .join(' ')
        fullText += pageText + '\n'
        
        // Security: stop if text exceeds limit
        if (fullText.length > MAX_TEXT_LENGTH) {
          fullText = fullText.slice(0, MAX_TEXT_LENGTH)
          break
        }
      } finally {
        // Clean up page resources to free memory
        page.cleanup()
      }
    }
    
    return fullText.trim()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('PDF parsing failed:', message)
    throw new ProcessingError(ErrorCode.PDF_PARSE_ERROR, 'unknown.pdf', message)
  } finally {
    // Clean up PDF document resources
    if (pdf) {
      try {
        pdf.destroy()
      } catch {
        // Ignore cleanup errors
      }
    }
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
  fileName: string
): Promise<GradedResume> {
  const zai = await ZAI.create()

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

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      thinking: { type: 'disabled' }
    })

    const responseText = completion.choices[0]?.message?.content || ''
    
    // Clean up the response (remove markdown code blocks if present)
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

    const parsed = JSON.parse(cleanedResponse)
    
    // Validate and sanitize parsed data
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('AI response parsing failed:', message)
    throw new ProcessingError(ErrorCode.AI_ERROR, fileName, message)
  }
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
function successResponse(results: GradedResume[]): NextResponse<ApiResponse> {
  return NextResponse.json({ success: true, results })
}

/**
 * Creates an error response from an APIError
 * 
 * @param error - APIError instance
 * @returns JSON response with error details and appropriate status code
 */
function errorResponse(error: APIError): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode }
  )
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
  try {
    // Security: Check content-length header to prevent oversized uploads
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE * MAX_FILES_PER_REQUEST * 1.5) {
      throw new RequestError(ErrorCode.CONTENT_TOO_LARGE, 'Request body is too large')
    }

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      throw new RequestError(ErrorCode.INVALID_REQUEST, 'Invalid request format')
    }
    
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

    const results: GradedResume[] = []

    // Process each file
    for (const fileRaw of filesRaw) {
      // Validate file object type
      if (!(fileRaw instanceof File)) {
        results.push(createErrorResumeResult('unknown.pdf', 'Invalid File', 'Invalid file object'))
        continue
      }
      
      const file = fileRaw as File

      // Validate file constraints
      const fileValidation = validateFile(file)
      if (!fileValidation.valid) {
        results.push(createErrorResumeResult(file.name, 'Invalid File', fileValidation.error || 'Invalid file'))
        continue
      }

      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Security: Validate PDF magic number
        if (!isValidPDF(buffer)) {
          results.push(createErrorResumeResult(file.name, 'Invalid PDF', 'File is not a valid PDF document'))
          continue
        }

        // Extract text from PDF
        const resumeText = await extractTextFromPDF(buffer)

        if (!resumeText || resumeText.trim().length < 50) {
          results.push(createErrorResumeResult(file.name, 'No Text Found', 'Could not extract readable text from this PDF'))
          continue
        }

        // Grade resume using AI
        const gradedResume = await gradeResume(
          resumeText, 
          titleValidation.sanitized!, 
          descriptionValidation.sanitized!, 
          file.name
        )
        results.push(gradedResume)
      } catch (error) {
        // Handle processing errors gracefully
        if (error instanceof ProcessingError) {
          results.push(createErrorResumeResult(file.name, 'Processing Error', error.message))
        } else {
          results.push(createErrorResumeResult(file.name, 'Processing Error', 'Failed to process this resume'))
        }
      }
    }

    return successResponse(results)
  } catch (error) {
    // Handle known API errors
    if (error instanceof APIError) {
      return errorResponse(error)
    }
    
    // Log unexpected errors but don't expose details to client
    console.error('Unexpected error in grade API:', error)
    return errorResponse(new APIError(ErrorCode.INTERNAL_ERROR))
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
