'use client'

import { useState, useEffect } from 'react'
import {
  Timer,
  ChevronLeft,
  ChevronRight,
  Flag,
  Menu,
  X
} from 'lucide-react'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function ExamTakePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(7200) // 2 hours
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Dummy questions
  const questions = Array.from({ length: 40 }).map((_, i) => ({
    id: `q-${i}`,
    content: `Pertanyaan ke-${i + 1}: Apa yang dimaksud dengan fotosintesis pada tumbuhan hijau dan sebutkan faktor utamanya?`,
    options: [
      { id: 'a', content: 'Proses pembuatan makanan dengan bantuan cahaya matahari' },
      { id: 'b', content: 'Proses pernapasan tumbuhan pada malam hari' },
      { id: 'c', content: 'Proses penyerapan air dari akar ke daun' },
      { id: 'd', content: 'Proses pengguguran daun pada musim kemarau' },
    ]
  }))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-muted flex flex-col z-50 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-card border-b px-8 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="font-bold leading-none">Simulasi OSN Matematika I</h1>
            <p className="text-xs uppercase font-bold text-primary tracking-wider mt-1">Sains & Matematika</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
            timeLeft < 600 ? 'bg-destructive/10 border-destructive/30 text-destructive animate-pulse' : 'bg-muted border-border'
          }`}>
            <Timer className="h-4 w-4" />
            <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Selesai Ujian
          </Button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto p-12 pb-32">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Pertanyaan No. {currentQuestion + 1}</span>
              <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100">
                <Flag className="h-3 w-3" /> Tandai Ragu
              </Button>
            </div>

            <div className="text-xl font-bold leading-relaxed">
              {questions[currentQuestion].content}
            </div>

            <div className="space-y-4">
              {questions[currentQuestion].options.map((opt, idx) => {
                const isSelected = answers[questions[currentQuestion].id] === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers({...answers, [questions[currentQuestion].id]: opt.id})}
                    className={`w-full p-6 rounded-2xl text-left border-2 transition-all flex items-center gap-6 group ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-md'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ring-1 transition-all ${
                      isSelected ? 'bg-primary text-primary-foreground ring-primary' : 'bg-muted text-muted-foreground ring-border group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`font-semibold text-lg ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {opt.content}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </main>

        {/* Navigation Sidebar */}
        <div className={`fixed inset-y-0 right-0 w-80 bg-card border-l shadow-2xl transition-transform duration-300 z-40 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'
        }`}>
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-bold">Navigasi Soal</h2>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5"/>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-5 gap-3">
                {questions.map((_, i) => {
                  const isAnswered = answers[questions[i].id] !== undefined
                  const isCurrent = currentQuestion === i
                  return (
                    <Button
                      key={i}
                      variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={() => setCurrentQuestion(i)}
                      className={`aspect-square ${
                        isCurrent ? 'scale-110 z-10' :
                        isAnswered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''
                      }`}
                    >
                      {i + 1}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>Terjawab</span>
                <span className="text-primary">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <footer className="h-20 bg-card border-t px-8 flex items-center justify-between z-30">
        <Button
          variant="ghost"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion(prev => prev - 1)}
        >
          <ChevronLeft className="h-6 w-6" />
          Sebelumnya
        </Button>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentQuestion % 5 ? 'bg-primary w-4' : 'bg-muted w-1.5'}`} />
              ))}
           </div>
        </div>

        <Button
          variant="ghost"
          disabled={currentQuestion === questions.length - 1}
          onClick={() => setCurrentQuestion(prev => prev + 1)}
          className="text-primary"
        >
          Selanjutnya
          <ChevronRight className="h-6 w-6" />
        </Button>
      </footer>
    </div>
  )
}
