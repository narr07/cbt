'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { StudentAnswerPDF } from './StudentAnswerPDF'
import { toast } from 'sonner'

interface Option {
  id: string
  content: string
  is_correct: boolean
}

interface Answer {
  question_id: string
  pg_option_id: string
  questions: {
    content: string
    image_url: string
    options: Option[]
  }
}

interface Submission {
  id: string
  score: number
  status: string
  correct_answers?: number
  total_questions?: number
  submitted_at?: string
  started_at?: string
  profiles: { full_name: string }
  exams: { title: string }
}

interface ExportPDFButtonProps {
  submission: Submission
  answers: Answer[]
  schoolName?: string
  schoolAddress?: string
}

export function ExportPDFButton({
  submission,
  answers,
  schoolName,
  schoolAddress
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Convert image URL to base64 to bypass CORS
  const imageToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const handleExport = async () => {
    if (answers.length === 0) {
      toast.error('Tidak ada jawaban untuk diekspor')
      return
    }

    setIsGenerating(true)

    try {
      // Helper to replace image URLs in HTML content with base64
      const replaceHtmlImages = async (html: string): Promise<string> => {
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
        const matches = [...html.matchAll(imgRegex)]
        let result = html

        for (const match of matches) {
          const originalUrl = match[1]
          const base64 = await imageToBase64(originalUrl)
          if (base64) {
            result = result.replace(originalUrl, base64)
          }
        }
        return result
      }

      // Preprocess answers: convert image URLs to base64
      const processedAnswers = await Promise.all(
        answers.map(async (ans) => {
          const updatedQuestions = { ...ans.questions }

          // Convert image_url field
          if (ans.questions.image_url) {
            const base64Image = await imageToBase64(ans.questions.image_url)
            if (base64Image) {
              updatedQuestions.image_url = base64Image
            }
          }

          // Convert images in HTML content
          if (ans.questions.content) {
            updatedQuestions.content = await replaceHtmlImages(ans.questions.content)
          }

          // Convert images in option content
          const processedOptions = await Promise.all(
            ans.questions.options.map(async (opt) => {
              if (opt.content) {
                const processedContent = await replaceHtmlImages(opt.content)
                return { ...opt, content: processedContent }
              }
              return opt
            })
          )
          updatedQuestions.options = processedOptions

          return { ...ans, questions: updatedQuestions }
        })
      )

      const doc = (
        <StudentAnswerPDF
          submission={submission}
          answers={processedAnswers}
          schoolName={schoolName}
          schoolAddress={schoolAddress}
        />
      )

      const blob = await pdf(doc).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Jawaban_${submission.profiles.full_name.replace(/\s+/g, '_')}_${submission.exams.title.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('PDF berhasil diunduh!')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Gagal membuat PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Membuat PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  )
}
