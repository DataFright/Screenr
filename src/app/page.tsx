/**
 * @fileoverview Main application page for Screenr - AI-powered resume screening tool
 * 
 * This component provides the primary user interface for:
 * - Uploading resume PDF files (up to 10 files, 10MB each)
 * - Entering job details (title and description)
 * - Triggering AI-powered resume grading
 * - Viewing ranked results with detailed scores
 * - Exporting results to CSV format
 * 
 * The component handles all state management, file validation, API communication,
 * and error handling for the resume grading workflow.
 * 
 * @module ResumeGrader
 * @requires react - useState, useCallback hooks
 * @requires sonner - Toast notifications
 * @requires lucide-react - UI icons
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/theme-toggle'
import { ErrorDisplay } from '@/components/error-boundary'
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  Trash2, 
  Trophy, 
  Mail, 
  Phone,
  Briefcase,
  GraduationCap,
  Star,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a graded resume with scores and candidate information
 * @property fileName - Original uploaded filename
 * @property candidateName - Extracted candidate name from resume
 * @property email - Extracted email address
 * @property phone - Extracted phone number
 * @property overallScore - Weighted average score (0-100)
 * @property professionalism - Score and explanation for formatting, clarity, tone
 * @property qualifications - Score and explanation for skills, education, certifications
 * @property workExperience - Score and explanation for depth, impact, relevance
 */
interface GradedResume {
  fileName: string
  candidateName: string
  email: string
  phone: string
  overallScore: number
  professionalism: {
    score: number
    explanation: string
  }
  qualifications: {
    score: number
    explanation: string
  }
  workExperience: {
    score: number
    explanation: string
  }
}

/**
 * API error response structure
 * @property code - Error code for programmatic handling
 * @property message - User-friendly error message
 * @property details - Additional error context (optional)
 */
interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * API response wrapper
 * @property success - Whether the request succeeded
 * @property results - Array of graded resumes (on success)
 * @property error - Error details (on failure)
 */
interface ApiResponse {
  success: boolean
  results?: GradedResume[]
  error?: ApiError
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of files that can be uploaded at once */
const MAX_FILES = 10

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed MIME types for file uploads */
const ALLOWED_TYPES = ['application/pdf']

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * User-friendly error messages mapped to error codes
 * These messages are displayed in toasts and error displays
 */
const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  FILE_TOO_LARGE: 'One or more files exceed the 10MB limit.',
  INVALID_FILE_TYPE: 'Only PDF files are allowed.',
  MISSING_FIELD: 'Please fill in all required fields.',
  INVALID_PDF: 'One or more files are not valid PDF documents.',
  AI_ERROR: 'The AI service is temporarily unavailable. Please try again.',
  CONTENT_TOO_LARGE: 'The upload is too large. Please reduce the number of files.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Main resume grading component
 * 
 * Handles the complete workflow:
 * 1. User enters job details (title, description)
 * 2. User uploads PDF resume files
 * 3. On submit, files are sent to /api/grade endpoint
 * 4. Results are displayed ranked by overall score
 * 5. User can export results to CSV
 * 
 * @returns JSX element containing the complete grading interface
 */
export default function ResumeGrader() {
  const [files, setFiles] = useState<File[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<GradedResume[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  useEffect(() => {
    const testWindow = window as Window & {
      Cypress?: unknown
      __SCREENR_E2E_RESULTS__?: GradedResume[]
    }

    if (!testWindow.Cypress || !Array.isArray(testWindow.__SCREENR_E2E_RESULTS__)) {
      return
    }

    setResults([...testWindow.__SCREENR_E2E_RESULTS__].sort((a, b) => b.overallScore - a.overallScore))
  }, [])

  const processSelectedFiles = useCallback((selectedFiles: File[]) => {
    setError(null)

    if (files.length + selectedFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Not a PDF file`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds 10MB limit`)
        continue
      }
      if (file.size < 100) {
        errors.push(`${file.name}: File appears to be empty`)
        continue
      }
      validFiles.push(file)
    }

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      toast.success(`Added ${validFiles.length} file(s)`)
    }
  }, [files.length])

  /**
   * Handles file selection from the file input
   * Validates file count, type, and size before adding to state
   * 
   * @param e - Change event from file input element
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }, [processSelectedFiles])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragActive) {
      setIsDragActive(true)
    }
  }, [isDragActive])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.currentTarget.contains(e.relatedTarget as Node | null)) {
      return
    }

    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    processSelectedFiles(Array.from(e.dataTransfer.files || []))
  }, [processSelectedFiles])

  /**
   * Removes a file from the uploaded files list
   * @param index - Index of the file to remove
   */
  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * Submits the grading request to the API
   * Validates inputs, sends FormData, and handles response/error states
   */
  const handleSubmit = async () => {
    // Clear previous errors
    setError(null)
    
    // Validation
    if (files.length === 0) {
      const err = { code: 'MISSING_FIELD', message: 'Please upload at least one resume' }
      setError(err)
      toast.error(err.message)
      return
    }
    if (!jobTitle.trim()) {
      const err = { code: 'MISSING_FIELD', message: 'Please enter a job title' }
      setError(err)
      toast.error(err.message)
      return
    }
    if (!jobDescription.trim()) {
      const err = { code: 'MISSING_FIELD', message: 'Please enter a job description' }
      setError(err)
      toast.error(err.message)
      return
    }

    setIsLoading(true)
    setResults([])

    const formData = new FormData()
    formData.append('jobTitle', jobTitle.trim())
    formData.append('jobDescription', jobDescription.trim())
    
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData,
      })

      const data: ApiResponse = await response.json()

      if (!response.ok || !data.success) {
        const apiError = data.error || { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to grade resumes' 
        }
        setError(apiError)
        toast.error(ERROR_MESSAGES[apiError.code] || apiError.message)
        return
      }

      if (data.results) {
        // Sort by overall score descending
        const sortedResults = [...data.results].sort((a, b) => b.overallScore - a.overallScore)
        setResults(sortedResults)
        
        // Count successful vs failed results
        const successful = sortedResults.filter(r => r.overallScore > 0).length
        const failed = sortedResults.length - successful
        
        if (failed > 0) {
          toast.warning(`Graded ${successful} resumes successfully, ${failed} failed`)
        } else {
          toast.success(`Successfully graded ${sortedResults.length} resumes`)
        }
      }
    } catch (err) {
      const apiError: ApiError = {
        code: 'INTERNAL_ERROR',
        message: 'Failed to connect to the server. Please check your connection.'
      }
      setError(apiError)
      toast.error(apiError.message)
      console.error('Error grading resumes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Exports grading results to a CSV file
   * Creates a downloadable CSV with all candidate scores and explanations
   */
  const downloadCSV = () => {
    if (results.length === 0) return

    const headers = [
      'Rank',
      'Candidate Name',
      'Email',
      'Phone',
      'Overall Score',
      'Professionalism Score',
      'Professionalism Explanation',
      'Qualifications Score',
      'Qualifications Explanation',
      'Work Experience Score',
      'Work Experience Explanation',
      'File Name'
    ]

    const rows = results.map((resume, index) => [
      index + 1,
      resume.candidateName,
      resume.email,
      resume.phone,
      resume.overallScore,
      resume.professionalism.score,
      resume.professionalism.explanation,
      resume.qualifications.score,
      resume.qualifications.explanation,
      resume.workExperience.score,
      resume.workExperience.explanation,
      resume.fileName
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `resume_grades_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('CSV downloaded successfully')
  }

  /**
   * Resets all form state to initial values
   * Clears files, job details, results, and errors
   */
  const clearAll = () => {
    setFiles([])
    setJobTitle('')
    setJobDescription('')
    setResults([])
    setError(null)
    toast.info('All data cleared')
  }

  /**
   * Determines the color class based on score value
   * @param score - Numeric score (0-100)
   * @returns Tailwind color class string
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  /**
   * Returns badge configuration for top 3 ranked candidates
   * @param index - Zero-based ranking index
   * @returns Badge config with icon, label, and color, or null for lower ranks
   */
  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: <Trophy className="h-4 w-4" />, label: '1st', color: 'bg-yellow-500' }
    if (index === 1) return { icon: <Trophy className="h-4 w-4" />, label: '2nd', color: 'bg-gray-400' }
    if (index === 2) return { icon: <Trophy className="h-4 w-4" />, label: '3rd', color: 'bg-amber-600' }
    return null
  }

  /**
   * Clears error state and retries the grading submission
   */
  const handleRetry = () => {
    setError(null)
    handleSubmit()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#050a14] dark:to-[#0a1420]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 font-mono">
            <span className="bg-gradient-to-r from-amber-600/80 to-yellow-600/70 bg-clip-text text-transparent">
              Screenr
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered resume evaluation and ranking for smarter hiring decisions
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay 
              title="Unable to Process Request"
              message={ERROR_MESSAGES[error.code] || error.message}
              code={error.code}
              onRetry={handleRetry}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Job Details Card */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-800 dark:to-emerald-700 text-white rounded-t-lg py-5">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Job Details
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Enter the position details for resume evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <label htmlFor="job-title" className="text-sm font-medium">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="job-title"
                    placeholder="e.g., Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value)
                      setError(null)
                    }}
                    className="border-slate-200 focus:border-emerald-500"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="job-description" className="text-sm font-medium">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="job-description"
                    placeholder="Describe the role, responsibilities, and required qualifications..."
                    value={jobDescription}
                    onChange={(e) => {
                      setJobDescription(e.target.value)
                      setError(null)
                    }}
                    rows={5}
                    className="border-slate-200 focus:border-emerald-500 resize-none"
                    aria-required="true"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Upload Card */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-800 dark:to-emerald-700 text-white rounded-t-lg py-5">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Resumes
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Upload PDF resumes for AI-powered grading
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Upload Limits Info */}
                <div className="flex flex-wrap gap-3 text-xs mb-4">
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">Max {MAX_FILES} files</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">
                    <Star className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">10MB per file</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">
                    <AlertCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">PDF only</span>
                  </div>
                </div>
                
                {/* Upload Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-slate-50/50 dark:bg-slate-900/50 ${isDragActive ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-600'}`}
                  data-testid="resume-dropzone"
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    data-testid="resume-file-input"
                    aria-label="Upload PDF resumes"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm text-muted-foreground" data-testid="resume-dropzone-label">
                      {isDragActive ? 'Drop PDF files here' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF files only (max 10MB each)
                    </span>
                  </label>
                </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <ScrollArea className="h-40 rounded-md border" data-testid="uploaded-files-list">
                      <div className="p-2 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between bg-slate-50 dark:bg-[#1a2a3a] rounded-md px-3 py-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                              aria-label={`Remove ${file.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || files.length === 0 || !jobTitle.trim() || !jobDescription.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 dark:from-emerald-900 dark:to-emerald-800 dark:hover:from-emerald-950 dark:hover:to-emerald-900 text-white shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Grading Resumes...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Grade Resumes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={isLoading}
                size="lg"
                className="border-slate-300"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-800 dark:to-emerald-700 text-white rounded-t-lg py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Grading Results
                    </CardTitle>
                    <CardDescription className="text-emerald-100">
                      Ranked candidates by overall score
                    </CardDescription>
                  </div>
                  {results.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={downloadCSV}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {results.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results yet. Upload resumes and click Grade to begin.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4 pr-4" data-testid="graded-results-list">
                      {results.map((resume, index) => {
                        const rankBadge = getRankBadge(index)
                        return (
                          <Card key={`${resume.fileName}-${index}`} className="overflow-hidden border-slate-200 dark:border-slate-700" data-testid="graded-resume-card">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {rankBadge ? (
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-white text-sm font-medium ${rankBadge.color}`}>
                                    {rankBadge.icon}
                                    <span>{rankBadge.label}</span>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-sm">
                                    #{index + 1}
                                  </Badge>
                                )}
                                <div>
                                  <p className="font-semibold">{resume.candidateName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{resume.fileName}</p>
                                </div>
                              </div>
                              <Badge 
                                data-testid="graded-resume-score"
                                className={`text-lg font-bold ${resume.overallScore >= 80 ? 'bg-green-500 text-white' : resume.overallScore >= 60 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}
                              >
                                {resume.overallScore}
                              </Badge>
                            </div>
                            
                            <div className="px-4 py-3 space-y-3">
                              {/* Contact Info */}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {resume.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{resume.email}</span>
                                  </div>
                                )}
                                {resume.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{resume.phone}</span>
                                  </div>
                                )}
                              </div>

                              <Separator />

                              {/* Scores */}
                              <div className="space-y-3">
                                {/* Professionalism */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Professionalism</span>
                                    <span className={getScoreColor(resume.professionalism.score)}>
                                      {resume.professionalism.score}/100
                                    </span>
                                  </div>
                                  <Progress 
                                    value={resume.professionalism.score} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {resume.professionalism.explanation}
                                  </p>
                                </div>

                                {/* Qualifications */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Qualifications</span>
                                    <span className={getScoreColor(resume.qualifications.score)}>
                                      {resume.qualifications.score}/100
                                    </span>
                                  </div>
                                  <Progress 
                                    value={resume.qualifications.score} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {resume.qualifications.explanation}
                                  </p>
                                </div>

                                {/* Work Experience */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Work Experience</span>
                                    <span className={getScoreColor(resume.workExperience.score)}>
                                      {resume.workExperience.score}/100
                                    </span>
                                  </div>
                                  <Progress 
                                    value={resume.workExperience.score} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {resume.workExperience.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>All data is processed in-memory and cleared when you close this page.</p>
        </footer>
      </div>
    </div>
  )
}
