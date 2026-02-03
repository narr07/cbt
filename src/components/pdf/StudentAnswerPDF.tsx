/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Styles - using default Helvetica font (built-in)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  schoolAddress: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  infoTable: {
    marginTop: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoColumn: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontSize: 9,
    color: '#333',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
  },
  summaryBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  summaryLabel: {
    width: 120,
    fontSize: 9,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  correctText: {
    color: '#16a34a',
  },
  incorrectText: {
    color: '#dc2626',
  },
  question: {
    marginBottom: 20,
    pageBreakInside: 'avoid',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 6,
  },
  questionNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
  },
  questionStatus: {
    fontSize: 8,
    fontWeight: 'bold',
    padding: '2 6',
    borderRadius: 3,
  },
  questionContent: {
    fontSize: 10,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  questionImage: {
    maxWidth: 300,
    maxHeight: 200,
    marginBottom: 10,
    objectFit: 'contain',
  },
  optionsList: {
    marginLeft: 10,
  },
  option: {
    flexDirection: 'row',
    marginBottom: 6,
    padding: 6,
    borderRadius: 3,
  },
  optionSelected: {
    backgroundColor: '#e0f2fe',
  },
  optionCorrect: {
    backgroundColor: '#dcfce7',
  },
  optionWrong: {
    backgroundColor: '#fef2f2',
  },
  optionLetter: {
    width: 20,
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: 10,
  },
  optionTextBold: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
})

// Helper to strip HTML tags
function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

// Helper to extract image data (URL + dimensions) from HTML content
interface ImageData {
  url: string
  width?: number
  height?: number
}

function extractImages(html: string): ImageData[] {
  if (!html) return []
  const imgRegex = /<img[^>]+>/gi
  const matches = html.match(imgRegex) || []

  return matches.map(imgTag => {
    // Extract src
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/)
    const url = srcMatch ? srcMatch[1] : ''

    // Extract width from attribute or style
    let width: number | undefined
    const widthAttrMatch = imgTag.match(/width=["']?(\d+)/)
    const styleWidthMatch = imgTag.match(/style=["'][^"']*width:\s*(\d+)/)
    if (widthAttrMatch) width = parseInt(widthAttrMatch[1])
    else if (styleWidthMatch) width = parseInt(styleWidthMatch[1])

    // Extract height from attribute or style
    let height: number | undefined
    const heightAttrMatch = imgTag.match(/height=["']?(\d+)/)
    const styleHeightMatch = imgTag.match(/style=["'][^"']*height:\s*(\d+)/)
    if (heightAttrMatch) height = parseInt(heightAttrMatch[1])
    else if (styleHeightMatch) height = parseInt(styleHeightMatch[1])

    return { url, width, height }
  }).filter(img => img.url)
}

// Types
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

interface StudentAnswerPDFProps {
  submission: Submission
  answers: Answer[]
  schoolName?: string
  schoolAddress?: string
}

export function StudentAnswerPDF({
  submission,
  answers,
  schoolName = "OLIMPIADE SAINS NASIONAL",
  schoolAddress = "Kec. Rajagaluh Kab. Majalengka"
}: StudentAnswerPDFProps) {
  // Calculate correct/incorrect summary
  const correctNumbers: number[] = []
  const incorrectNumbers: number[] = []

  answers.forEach((ans, idx) => {
    const correctOption = ans.questions.options.find((o) => o.is_correct)
    const isCorrect = ans.pg_option_id === correctOption?.id
    if (isCorrect) {
      correctNumbers.push(idx + 1)
    } else {
      incorrectNumbers.push(idx + 1)
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.schoolAddress}>{schoolAddress}</Text>
        </View>

        {/* Info Table */}
        <View style={styles.infoTable}>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Siswa</Text>
              <Text style={styles.infoValue}>: {submission.profiles.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Ujian</Text>
              <Text style={styles.infoValue}>: {submission.exams.title}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal</Text>
              <Text style={styles.infoValue}>: {submission.submitted_at ? (() => {
                const d = new Date(submission.submitted_at)
                const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
              })() : '-'}</Text>
            </View>
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Skor Akhir</Text>
              <Text style={styles.infoValue}>: {submission.score || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jawaban Benar</Text>
              <Text style={styles.infoValue}>: {submission.correct_answers || correctNumbers.length} / {submission.total_questions || answers.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>: {submission.status === 'submitted' ? 'Selesai' : 'Dalam Proses'}</Text>
            </View>
          </View>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Ringkasan Jawaban</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nomor Benar:</Text>
            <Text style={[styles.summaryValue, styles.correctText]}>
              {correctNumbers.length > 0 ? correctNumbers.join(', ') : '-'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nomor Salah:</Text>
            <Text style={[styles.summaryValue, styles.incorrectText]}>
              {incorrectNumbers.length > 0 ? incorrectNumbers.join(', ') : '-'}
            </Text>
          </View>
        </View>

        {/* Questions */}
        {answers.map((ans, idx) => {
          const correctOption = ans.questions.options.find((o) => o.is_correct)
          const isCorrect = ans.pg_option_id === correctOption?.id

          return (
            <View key={idx} style={styles.question} wrap={false}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>({idx + 1}) PG</Text>
                <Text style={[
                  styles.questionStatus,
                  { backgroundColor: isCorrect ? '#dcfce7' : '#fef2f2', color: isCorrect ? '#16a34a' : '#dc2626' }
                ]}>
                  {isCorrect ? '✓ BENAR' : '✗ SALAH'}
                </Text>
              </View>

              <Text style={styles.questionContent}>
                {stripHtml(ans.questions.content)}
              </Text>

              {/* Question Image */}
              {ans.questions.image_url && (
                <Image
                  src={ans.questions.image_url}
                  style={styles.questionImage}
                />
              )}

              {/* Question Images - extracted from HTML content */}
              {extractImages(ans.questions.content).map((img, imgIdx) => (
                <Image
                  key={imgIdx}
                  src={img.url}
                  style={{
                    ...styles.questionImage,
                    ...(img.width && { width: img.width }),
                    ...(img.height && { height: img.height }),
                  }}
                />
              ))}

              <View style={styles.optionsList}>
                {ans.questions.options.map((opt, oIdx) => {
                  const isSelected = opt.id === ans.pg_option_id
                  const isCorrectOption = opt.is_correct

                  // Build style array properly for @react-pdf
                  const optionStyles = [
                    styles.option,
                    (isSelected && isCorrectOption) ? styles.optionCorrect : null,
                    (isSelected && !isCorrectOption) ? styles.optionWrong : null,
                    (!isSelected && isCorrectOption) ? styles.optionCorrect : null,
                  ].filter(Boolean)

                  return (
                    <View key={opt.id} style={optionStyles as any}>
                      <Text style={isSelected ? [styles.optionLetter, styles.optionTextBold] : styles.optionLetter}>
                        {String.fromCharCode(97 + oIdx)}.
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={isSelected ? [styles.optionText, styles.optionTextBold] : styles.optionText}>
                          {stripHtml(opt.content)}
                        </Text>
                        {/* Option Images - extracted from HTML content */}
                        {extractImages(opt.content).map((img, imgIdx) => (
                          <Image
                            key={imgIdx}
                            src={img.url}
                            style={{
                              ...styles.questionImage,
                              ...(img.width && { width: img.width }),
                              ...(img.height && { height: img.height }),
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Dicetak pada {(() => {
            const d = new Date()
            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          })()} - CBT Online | © permadi.dev
        </Text>
      </Page>
    </Document>
  )
}
