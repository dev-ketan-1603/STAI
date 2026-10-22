import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

/**
 * PEASPanel — Unit III: Intelligent Agents
 * Displays STAI as a formal intelligent agent using the PEAS framework.
 * Performance | Environment | Actuators | Sensors
 */

const PEAS = [
  {
    letter: 'P',
    label: 'Performance Measure',
    color: 'bg-[#FFFF66]',
    borderColor: 'border-[#c8c800]',
    icon: '🎯',
    items: [
      'Improvement in quiz scores over time',
      'Accuracy of study hour recommendations vs actual',
      'Schedule adherence and exam readiness score',
      'Reduction in weak-subject difficulty level',
    ],
  },
  {
    letter: 'E',
    label: 'Environment',
    color: 'bg-[#FFB6C1]',
    borderColor: 'border-[#e0748a]',
    icon: '🌍',
    items: [
      'Student profile: name, subjects, education level',
      'Exam dates and subject deadlines',
      'Historical quiz attempts and scores per subject',
      'Daily session logs: focus level, break count, study hours',
    ],
  },
  {
    letter: 'A',
    label: 'Actuators',
    color: 'bg-[#87CEEB]',
    borderColor: 'border-[#4a9dbf]',
    icon: '⚙️',
    items: [
      'Personalized 14-day AI study schedule',
      'Recommended optimal study hours (ML model output)',
      'Generated MCQ and long-answer practice questions',
      'Subject difficulty classification (Easy / Medium / Hard)',
      'A* optimal study order across all subjects',
    ],
  },
  {
    letter: 'S',
    label: 'Sensors',
    color: 'bg-[#D8B4FE]',
    borderColor: 'border-[#a855f7]',
    icon: '📡',
    items: [
      'Quiz attempt results submitted by the student',
      'Session tracker: focus level, breaks taken',
      'User-entered study hours and daily goals',
      'Notes and PDF uploads for AI summarization',
    ],
  },
];

const AGENT_TYPES = [
  { label: 'Model-based', desc: 'Remembers past quiz scores and session history across visits' },
  { label: 'Goal-based', desc: 'Targets exam dates and score improvement as explicit goals' },
  { label: 'Learning Agent', desc: 'Timetable allocation improves as more quizzes are attempted' },
];

export default function PEASPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] overflow-hidden shadow-[3px_3px_0_#0D0D0D]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9F9F9] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#0D0D0D] flex items-center justify-center">
            <Brain size={16} className="text-[#FFFF66]" />
          </div>
          <div className="text-left">
            <div className="text-sm font-extrabold text-[#0D0D0D]">
              STAI as an Intelligent Agent — PEAS Framework
            </div>
            <div className="text-[11px] text-[#777777]">Unit III · Agent Architecture Explained</div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-[#0D0D0D] px-5 pb-6 pt-5">
          {/* PEAS Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 max-md:grid-cols-1">
            {PEAS.map(p => (
              <div
                key={p.letter}
                className={`${p.color} border-2 ${p.borderColor} rounded-[14px] p-4`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#0D0D0D] text-white text-[13px] font-black flex items-center justify-center flex-shrink-0">
                    {p.letter}
                  </span>
                  <div>
                    <div className="text-[12px] font-extrabold text-[#0D0D0D]">{p.icon} {p.label}</div>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {p.items.map((item, i) => (
                    <li key={i} className="text-[11px] flex gap-1.5 items-start text-[#1a1a1a]">
                      <span className="mt-0.5 flex-shrink-0 text-[#0D0D0D] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Agent Type Classification */}
          <div className="bg-[#F4F4F6] border-2 border-[#0D0D0D] rounded-[12px] p-4">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#555555] mb-2.5">
              Agent Type Classification
            </div>
            <div className="flex flex-col gap-2">
              {AGENT_TYPES.map(t => (
                <div key={t.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 px-2 py-0.5 bg-[#0D0D0D] text-[#FFFF66] rounded-full text-[10px] font-black whitespace-nowrap flex-shrink-0">
                    {t.label}
                  </span>
                  <span className="text-[12px] text-[#444444]">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
