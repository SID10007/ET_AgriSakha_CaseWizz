import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  ArrowRight,
  Leaf,
  Clock,
  Droplet,
  Sprout,
  Tractor,
  Sun,
  Wheat,
  Cloud,
  Mic,
  Check,
  Loader2,
} from "lucide-react";

export type QuizOption = {
  title: string;
  description: string;
  icon: string;
};

export type QuizQuestion = {
  question: string;
  options: QuizOption[];
  correctIndex: number;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  leaf: Leaf,
  clock: Clock,
  droplet: Droplet,
  seed: Sprout,
  tractor: Tractor,
  sun: Sun,
  wheat: Wheat,
  cloud: Cloud,
};

const TOTAL = 5;

const API_BASE =
  (import.meta.env.VITE_MAIN_BACKEND_URL as string | undefined) ??
  "http://127.0.0.1:5000";

function OptionIcon({ name }: { name: string }) {
  const C = ICON_MAP[name?.toLowerCase?.()] ?? Leaf;
  return <C className="h-5 w-5" />;
}

interface QuickQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickQuizModal: React.FC<QuickQuizModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    detail: string;
    correctTitle: string;
    source: "tap" | "voice";
  } | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const resetRound = useCallback(() => {
    setSelected(null);
    setFeedback(null);
  }, []);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agri-quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load quiz");
      const qs = (data.questions || []) as QuizQuestion[];
      if (!qs.length) throw new Error("No questions returned");
      setQuestions(qs.slice(0, TOTAL));
      setQIndex(0);
      resetRound();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load quiz");
    } finally {
      setLoading(false);
    }
  }, [resetRound]);

  useEffect(() => {
    if (isOpen) {
      loadQuiz();
    }
  }, [isOpen, loadQuiz]);

  const q = questions[qIndex];

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  const startRecording = async () => {
    if (!q || feedback) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        await processVoiceAnswer(blob);
      };
      mr.start();
      setRecording(true);
    } catch {
      setLoadError("Microphone access denied or unavailable.");
    }
  };

  const processVoiceAnswer = async (blob: Blob) => {
    if (!q) return;
    setVoiceBusy(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const tr = await fetch(`${API_BASE}/api/agri-quiz/transcribe`, {
        method: "POST",
        body: fd,
      });
      const td = await tr.json();
      if (!tr.ok) throw new Error(td.error || "Transcription failed");
      const text = (td.text || "").trim();
      if (!text) {
        setFeedback({
          correct: false,
          detail: "Could not hear your answer clearly. Please try again or tap an option.",
          correctTitle: q.options[q.correctIndex]?.title || "",
          source: "voice",
        });
        return;
      }
      const ev = await fetch(`${API_BASE}/api/agri-quiz/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          userAnswer: text,
        }),
      });
      const ed = await ev.json();
      if (!ev.ok) throw new Error(ed.message || "Evaluation failed");
      setFeedback({
        correct: !!ed.isCorrect,
        detail: ed.feedback || "",
        correctTitle: ed.correctOptionTitle || q.options[q.correctIndex]?.title || "",
        source: "voice",
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Voice answer failed");
    } finally {
      setVoiceBusy(false);
    }
  };

  const handleNext = () => {
    if (!q) return;
    if (!feedback) {
      if (selected === null) return;
      const correct = selected === q.correctIndex;
      setFeedback({
        correct,
        detail: correct
          ? "Nice work — that matches what we teach in the field."
          : "Keep learning — check the correct answer below.",
        correctTitle: q.options[q.correctIndex]?.title || "",
        source: "tap",
      });
      return;
    }
    if (qIndex >= TOTAL - 1) {
      onClose();
      return;
    }
    setQIndex((i) => i + 1);
    resetRound();
  };

  if (!isOpen) return null;

  const progress = ((qIndex + 1) / TOTAL) * 100;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-title"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#F9F9F4] shadow-2xl border border-[#003322]/12">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[#003322]/50 hover:bg-[#003322]/10 hover:text-[#003322]"
          aria-label="Close quiz"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 border-b border-[#003322]/10 bg-[#F9F9F4] px-4 pb-3 pt-4 pr-12">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#fccd03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#003322]">
              Growth progress
            </span>
            <span className="text-xs text-[#003322]/55">
              Question {Math.min(qIndex + 1, TOTAL)} of {TOTAL}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5e4dc]">
            <div
              className="h-full rounded-full bg-[#003322] transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#003322]">
              <Loader2 className="h-10 w-10 animate-spin text-[#003322]" />
              <p className="text-sm">Preparing your quiz…</p>
            </div>
          )}
          {loadError && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {loadError}
              <button
                type="button"
                onClick={loadQuiz}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && q && (
            <>
              <h2
                id="quiz-title"
                className="mb-4 font-serif text-lg font-bold leading-snug text-[#003322] sm:text-xl"
              >
                {q.question}
              </h2>

              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-medium text-[#003322]/60">Answer with a tap or your voice</span>
                <button
                  type="button"
                  disabled={!!feedback || voiceBusy || recording}
                  onClick={() => (recording ? stopRecording() : startRecording())}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    recording
                      ? "border-red-400 bg-red-50 text-red-700 animate-pulse"
                      : "border-[#003322]/25 bg-white text-[#003322] hover:bg-[#003322]/5"
                  } disabled:opacity-40`}
                >
                  {voiceBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {recording ? "Stop" : "Speak answer"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {q.options.map((opt, idx) => {
                  const isSel = selected === idx;
                  const isCorrect = feedback && idx === q.correctIndex;
                  const showCheck = feedback && isCorrect;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!!feedback}
                      onClick={() => !feedback && setSelected(idx)}
                      className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-all ${
                        showCheck
                          ? "border-[#003322] bg-[#f0f7f2]"
                          : isSel && !feedback
                            ? "border-[#003322] ring-1 ring-[#003322]/30"
                            : "border-[#e0dfd6] bg-white hover:border-[#003322]/35"
                      } ${feedback && !isCorrect && isSel ? "border-amber-300 bg-amber-50/80" : ""}`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          showCheck ? "bg-[#003322] text-white" : "bg-[#eceae3] text-[#003322]/70"
                        }`}
                      >
                        <OptionIcon name={opt.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#003322]">{opt.title}</div>
                        <div className="text-sm text-[#003322]/65">{opt.description}</div>
                      </div>
                      {showCheck && <Check className="h-6 w-6 shrink-0 text-[#003322]" />}
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div
                  className={`mt-4 rounded-xl border px-3 py-3 text-sm ${
                    feedback.correct
                      ? "border-green-200 bg-green-50 text-green-900"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                >
                  <p className="font-semibold">
                    {feedback.correct ? "Correct" : "Not quite"}
                    {feedback.source === "voice" ? " (from your voice)" : ""}
                  </p>
                  <p className="mt-1 text-[#003322]/85">{feedback.detail}</p>
                  {!feedback.correct && (
                    <p className="mt-2 font-medium text-[#003322]">
                      Correct answer: <span className="font-bold">{feedback.correctTitle}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[#003322]/10 bg-[#eceae3]/90 px-4 py-3">
          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || (!q ? true : !feedback && selected === null)}
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-full bg-[#003322] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#004433] disabled:opacity-40"
            >
              {feedback && qIndex >= TOTAL - 1 ? "Finish" : "Next question"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickQuizModal;
