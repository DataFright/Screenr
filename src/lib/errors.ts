/**
 * @fileoverview Custom Error Classes for Screenr API
 * 
 * This module provides a comprehensive error handling system with:
 * - Structured error codes for consistent identification
 * - HTTP status code mapping for proper responses
 * - User-friendly error messages
 * - Specialized error classes for different error types
 * 
 * Error categories:
 * - Validation errors (1xxx): Input validation failures
 * - Rate limiting errors (2xxx): Throttling issues
 * - Processing errors (3xxx): Resume processing failures
 * - Request errors (4xxx): Invalid request issues
 * - Server errors (5xxx): Internal server problems
 * 
 * @module lib/errors
 */

// ============================================================================
// ERROR CODES ENUM
// ============================================================================

/**
 * Enumeration of all possible error codes in the application
 * Used for consistent error identification across frontend and backend
 */
export enum ErrorCode {
  // Validation errors (1xxx) - Input validation failures
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TOO_SMALL = 'FILE_TOO_SMALL',
  INVALID_FILENAME = 'INVALID_FILENAME',
  INVALID_PDF = 'INVALID_PDF',
  
  // Rate limiting errors (2xxx) - Throttling issues
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Processing errors (3xxx) - Resume processing failures
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  PDF_PARSE_ERROR = 'PDF_PARSE_ERROR',
  AI_ERROR = 'AI_ERROR',
  NO_TEXT_EXTRACTED = 'NO_TEXT_EXTRACTED',
  
  // Request errors (4xxx) - Invalid request issues
  INVALID_REQUEST = 'INVALID_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  
  // Server errors (5xxx) - Internal server problems
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// ============================================================================
// ERROR STATUS MAPPING
// ============================================================================

/**
 * Maps error codes to HTTP status codes
 * Ensures consistent HTTP responses across the API
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.FILE_TOO_SMALL]: 400,
  [ErrorCode.INVALID_FILENAME]: 400,
  [ErrorCode.INVALID_PDF]: 400,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.PROCESSING_ERROR]: 422,
  [ErrorCode.PDF_PARSE_ERROR]: 422,
  [ErrorCode.AI_ERROR]: 502,
  [ErrorCode.NO_TEXT_EXTRACTED]: 422,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.CONTENT_TOO_LARGE]: 413,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Default user-friendly messages for each error code
 * These messages are safe to show to end users
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FILE_TYPE]: 'Only PDF files are allowed',
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum allowed limit',
  [ErrorCode.FILE_TOO_SMALL]: 'File appears to be empty or corrupted',
  [ErrorCode.INVALID_FILENAME]: 'Filename contains invalid characters',
  [ErrorCode.INVALID_PDF]: 'File is not a valid PDF document',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  [ErrorCode.PROCESSING_ERROR]: 'Failed to process the request',
  [ErrorCode.PDF_PARSE_ERROR]: 'Could not read the PDF file',
  [ErrorCode.AI_ERROR]: 'AI service is temporarily unavailable',
  [ErrorCode.NO_TEXT_EXTRACTED]: 'Could not extract text from the PDF',
  [ErrorCode.INVALID_REQUEST]: 'Invalid request format',
  [ErrorCode.METHOD_NOT_ALLOWED]: 'HTTP method not allowed',
  [ErrorCode.CONTENT_TOO_LARGE]: 'Request body is too large',
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
}

// ============================================================================
// BASE API ERROR CLASS
// ============================================================================

/**
 * Base class for all API errors
 * Provides structured error information with codes, status codes, and details
 * 
 * @example
 * throw new APIError(ErrorCode.INTERNAL_ERROR, 'Something went wrong', { context: 'value' })
 */
export class APIError extends Error {
  /** Error code for programmatic handling */
  public readonly code: ErrorCode
  
  /** HTTP status code for the response */
  public readonly statusCode: number
  
  /** Additional error details (safe to expose to clients) */
  public readonly details?: Record<string, unknown>
  
  /** Whether this is an operational error (expected) vs programming error (unexpected) */
  public readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'APIError'
    this.code = code
    this.statusCode = ERROR_STATUS_MAP[code]
    this.details = details
    this.isOperational = isOperational
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, APIError.prototype)
  }

  /**
   * Converts the error to a JSON-serializable format
   * Used for API responses
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }

  /**
   * Creates an APIError from an unknown error
   * Useful for normalizing caught errors
   * 
   * @param error - Unknown error to convert
   * @param fallbackCode - Error code to use if error is not an APIError
   * @returns APIError instance
   */
  static fromError(error: unknown, fallbackCode: ErrorCode = ErrorCode.INTERNAL_ERROR): APIError {
    if (error instanceof APIError) {
      return error
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return new APIError(fallbackCode, message)
  }
}

// ============================================================================
// SPECIALIZED ERROR CLASSES
// ============================================================================

/**
 * Validation Error - for input validation failures
 * Used when user input doesn't meet requirements
 * 
 * @example
 * throw new ValidationError('Email is invalid', 'email')
 */
export class ValidationError extends APIError {
  constructor(message: string, field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, field ? { field } : undefined)
    this.name = 'ValidationError'
  }
}

/**
 * File Validation Error - for file-related validation failures
 * Used when uploaded files don't meet requirements
 * 
 * @example
 * throw new FileValidationError(ErrorCode.FILE_TOO_LARGE, 'resume.pdf', { maxSize: '10MB' })
 */
export class FileValidationError extends APIError {
  constructor(code: ErrorCode, filename?: string, details?: Record<string, unknown>) {
    super(code, ERROR_MESSAGES[code], { 
      ...(filename && { filename }),
      ...details 
    })
    this.name = 'FileValidationError'
  }
}

/**
 * Rate Limit Error - when rate limit is exceeded
 * Includes retry-after information for clients
 * 
 * @example
 * throw new RateLimitError(60) // Retry after 60 seconds
 */
export class RateLimitError extends APIError {
  /** Seconds until the rate limit resets */
  public readonly retryAfter: number

  constructor(retryAfter: number = 60) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, undefined, { retryAfter })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Processing Error - for resume processing failures
 * Used when AI or PDF processing fails
 * 
 * @example
 * throw new ProcessingError(ErrorCode.AI_ERROR, 'resume.pdf', 'AI timeout')
 */
export class ProcessingError extends APIError {
  constructor(code: ErrorCode, filename: string, details?: string) {
    super(code, ERROR_MESSAGES[code], { 
      filename,
      ...(details && { details }) 
    })
    this.name = 'ProcessingError'
  }
}

/**
 * Request Error - for invalid requests
 * Used when the request itself is malformed or invalid
 * 
 * @example
 * throw new RequestError(ErrorCode.INVALID_REQUEST, 'Missing content-type header')
 */
export class RequestError extends APIError {
  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(code, message, details)
    this.name = 'RequestError'
  }
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Error result type for operations that can fail
 */
export interface ErrorResult {
  success: false
  error: APIError
}

/**
 * Success result type for operations that succeed
 */
export interface SuccessResult<T> {
  success: true
  data: T
}

/**
 * Union type for operations that can succeed or fail
 * Enables type-safe error handling
 */
export type Result<T> = SuccessResult<T> | ErrorResult

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates an error result from an APIError
 * 
 * @param error - APIError instance
 * @returns ErrorResult object
 */
export function createErrorResult(error: APIError): ErrorResult {
  return { success: false, error }
}

/**
 * Creates a success result from data
 * 
 * @param data - Success data
 * @returns SuccessResult object
 */
export function createSuccessResult<T>(data: T): SuccessResult<T> {
  return { success: true, data }
}

/**
 * Try-catch wrapper that converts errors to APIErrors
 * Useful for wrapping async operations
 * 
 * @param fn - Async function to execute
 * @param fallbackCode - Error code to use on failure
 * @returns Result object (success or error)
 * 
 * @example
 * const result = await tryCatch(async () => {
 *   return await someAsyncOperation()
 * })
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error.message)
 * }
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  fallbackCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): Promise<Result<T>> {
  try {
    const data = await fn()
    return createSuccessResult(data)
  } catch (error) {
    const apiError = APIError.fromError(error, fallbackCode)
    return createErrorResult(apiError)
  }
}
