"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const questions = [
  { key: "pace", title: "What pace feels right?", options: [["slow", "Unhurried mornings"], ["active", "Out exploring"], ["social", "Good company"]] },
  { key: "setting", title: "Pick your setting.", options: [["hills", "Misty hills"], ["forest", "Deep green forest"], ["coast", "The coast"], ["heritage", "Old-world charm"], ["farm", "A working farm"]] },
  { key: "activities", title: "What would you love to do?", options: [["nature", "Walk in nature"], ["food", "Find local food"], ["culture", "Meet local culture"], ["water", "Be near water"], ["rest", "Do very little"]] },
  { key: "group", title: "Who’s coming along?", options: [["couple", "Just us two"], ["family", "Family"], ["friends", "A few friends"], ["solo", "Just me"]] },
  { key: "budget", title: "What feels comfortable per night?", options: [["budget", "Under ₹3,000"], ["midrange", "₹3,000–₹7,000"], ["splurge", "A little extra"]] },
] as const;
type Answers = { pace: "slow" | "active" | "social"; setting: "hills" | "forest" | "coast" | "heritage" | "farm"; activities: "nature" | "food" | "culture" | "water" | "rest"; group: "couple" | "family" | "friends" | "solo"; budget: "budget" | "midrange" | "splurge" };
type Match = { id: string; slug: string; title: string; city: string; pricePerNight: number; image: string | null; match: number; why: string };

export default function VibeQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(true);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(false);

  async function choose(key: keyof Answers, value: string) {
    const updated = { ...answers, [key]: value } as Partial<Answers>;
    setAnswers(updated);
    if (step < questions.length - 1) { setStep(step + 1); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/ai/vibe-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      const result = await response.json() as { matches?: Match[]; aiGenerated?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Your vibe matches could not be found.");
      setMatches(result.matches ?? []);
      setAiGenerated(result.aiGenerated ?? false);
      setHasResults(true);
      setSlide(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your vibe matches could not be found.");
      setStep(questions.length - 1);
    } finally { setLoading(false); }
  }

  const question = questions[step];
  const match = matches[slide];
  return <section className="vibe-quiz-section" id="vibe-quiz">
    <p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> A little more you</p>
    <div className="vibe-quiz-heading"><h2>Find your <em>kind of away.</em></h2><p>Five little choices. A few stays that feel like you.</p></div>
    {!hasResults ? <div className="vibe-quiz-card">
      <div className="vibe-quiz-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
      <p className="detail-section-kicker">QUESTION {step + 1} OF {questions.length}</p>
      <h3>{question.title}</h3>
      <div className="vibe-choice-grid">{question.options.map(([value, label], index) => <motion.button key={value} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }} onClick={() => void choose(question.key, value)} disabled={loading}>{label}<ArrowRight size={14} /></motion.button>)}</div>
      {step > 0 && <button className="vibe-back" type="button" onClick={() => setStep(step - 1)} disabled={loading}><ArrowLeft size={14} /> Previous question</button>}
      {loading && <p className="vibe-loading"><LoaderCircle size={16} className="spin" /> Finding your matches…</p>}
    </div> : <div className="vibe-results">
      <div className="vibe-results-head"><span><Sparkles size={16} /> {aiGenerated ? "AI-generated matches" : "Matches from listing details"}</span><button type="button" onClick={() => { setMatches([]); setHasResults(false); setStep(0); setAnswers({}); }}>Retake quiz</button></div>
      {match ? <AnimatePresence mode="wait"><motion.article key={match.id} className="vibe-result-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
        <div className="vibe-result-image" style={match.image ? { backgroundImage: `url("${match.image}")` } : undefined}><span>{match.match}% match</span></div>
        <div className="vibe-result-copy"><p className="detail-section-kicker">A STAY THAT FEELS LIKE YOU</p><h3>{match.title}</h3><p className="vibe-result-location">{match.city} · ₹{match.pricePerNight.toLocaleString("en-IN")} / night</p><p>{match.why}</p><small>{aiGenerated ? "AI-generated match" : "Match"} · Based on your quiz answers and listing details.</small><Link href={`/listings/${match.slug}`} className="button button-dark">Explore this stay <ArrowRight size={15} /></Link></div>
      </motion.article></AnimatePresence> : <p className="vibe-empty">No published stays are available to match those answers yet. Please check back soon.</p>}
      {matches.length > 1 && <div className="vibe-carousel-controls"><button type="button" aria-label="Previous match" onClick={() => setSlide((slide + matches.length - 1) % matches.length)}><ArrowLeft size={16} /></button><span>{slide + 1} / {matches.length}</span><button type="button" aria-label="Next match" onClick={() => setSlide((slide + 1) % matches.length)}><ArrowRight size={16} /></button></div>}
    </div>}
  </section>;
}
