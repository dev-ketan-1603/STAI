import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashHeader from '../components/DashHeader';
import { useAuth } from '../context/AuthContext';
import { generateStudySchedule } from '../utils/ai';
import api from '../utils/api';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  BookOpen,
  Brain,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  Flame,
  Lightbulb,
  Route,
} from 'lucide-react';

const PRIORITY_THEMES = {
  high: {
    bg: '#FFB6C1',
    lightBg: 'rgba(255, 182, 193, 0.18)',
    border: 'rgba(255, 182, 193, 0.45)',
    text: '#d83a56',
    label: 'High Priority',
  },
  medium: {
    bg: '#FFFF66',
    lightBg: 'rgba(255, 255, 102, 0.22)',
    border: 'rgba(255, 255, 102, 0.5)',
    text: '#8a8400',
    label: 'Medium Priority',
  },
  low: {
    bg: '#87CEEB',
    lightBg: 'rgba(135, 206, 235, 0.2)',
    border: 'rgba(135, 206, 235, 0.45)',
    text: '#17749b',
    label: 'Low Priority',
  },
};

const SUBJECT_EMOJIS = {
  mathematics: '📐', math: '📐', physics: '⚛️', chemistry: '🧪', biology: '🧬',
  english: '📖', history: '🏛️', geography: '🌍', 'computer science': '💻',
  python: '🐍', 'data structures': '🌳', algorithms: '⚙️', 'machine learning': '🤖',
  economics: '📊', accountancy: '💰', 'business studies': '🏢', 'political science': '🏛️',
  default: '📓',
};

function getSubjectEmoji(name) {
  const key = String(name || '').toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return SUBJECT_EMOJIS.default;
}

const START_HOUR = 8;
const END_HOUR = 22;

function formatDateStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDuration(dur) {
  if (!dur) return 1;
  const s = String(dur).toLowerCase();
  const minMatch = s.match(/(\d+)\s*(?:m|min|minute)/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    return Math.max(1, Math.min(4, Math.round(mins / 60)));
  }
  const match = s.match(/(\d+(?:\.\d+)?)\s*h/);
  return match ? Math.max(1, Math.min(4, Math.round(parseFloat(match[1])))) : 1;
}

function buildDayBlocks(schedule, dateStr) {
  const items = (schedule || []).filter((s) => s.date === dateStr);
  if (!items.length) return [];
  const priorityOrder = (p) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
  const sorted = [...items].sort((a, b) => priorityOrder(b.priority) - priorityOrder(a.priority));
  let hour = START_HOUR;
  const blocks = [];
  sorted.forEach((item, idx) => {
    const span = Math.min(parseDuration(item.duration), END_HOUR - hour);
    const startH = hour;
    const endH = hour + Math.max(1, span);
    hour = endH;
    blocks.push({
      ...item,
      id: item.id || `${item.date}-${item.subject}-${idx}`,
      startHour: startH,
      endHour: endH,
      subtopics: Array.isArray(item.subtopics) ? item.subtopics : [],
      completedSubtopics: Array.isArray(item.completedSubtopics) ? item.completedSubtopics : [],
      completed: Boolean(item.completed),
    });
  });
  return blocks;
}

export default function Timetable() {
  const { eduData } = useAuth();
  const navigate = useNavigate();
  const subjects = eduData?.subjects || [];

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [schedule, setSchedule] = useState([]);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'add'|'edit', item? }
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'roadmap'

  const selectedDateStr = useMemo(() => formatDateStr(selectedDate), [selectedDate]);
  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  const dayBlocks = useMemo(
    () => buildDayBlocks(schedule, selectedDateStr),
    [schedule, selectedDateStr]
  );

  // Generate 14-day strip dates starting from today or the earliest schedule date
  const fourteenDays = useMemo(() => {
    const base = new Date();
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dStr = formatDateStr(d);
      const daySessions = (schedule || []).filter((s) => s.date === dStr);
      const totalCompleted = daySessions.filter((s) => s.completed).length;
      days.push({
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        sessionCount: daySessions.length,
        isCompleted: daySessions.length > 0 && totalCompleted === daySessions.length,
        hasSessions: daySessions.length > 0,
        isToday: dStr === todayStr,
      });
    }
    return days;
  }, [schedule, todayStr]);

  // Load saved timetable & AI predictions on mount
  useEffect(() => {
    api
      .get('/timetable')
      .then(({ data }) => {
        if (data.timetable?.schedule?.length) {
          setSchedule(data.timetable.schedule);
          setHoursPerDay(data.timetable.hoursPerDay ?? 3);
        }
      })
      .catch(() => {});

    api
      .post('/ai-predict', { study_hours: hoursPerDay })
      .then(({ data }) => setAiPrediction(data))
      .catch(() => {});
  }, []);

  const saveSchedule = async (updatedSchedule) => {
    setSaving(true);
    try {
      await api.post('/timetable', { schedule: updatedSchedule, hoursPerDay });
      setSchedule(updatedSchedule);
      setModal(null);
    } catch (err) {
      console.error('Failed to save timetable:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingSchedule(true);
    try {
      const todayDateStr = formatDateStr(new Date());
      const result = await generateStudySchedule(subjects, [], hoursPerDay, todayDateStr);
      const sched = result.schedule || [];
      if (sched.length > 0) {
        setSchedule(sched);
        setSelectedDate(new Date());
        await api.post('/timetable', { schedule: sched, hoursPerDay });
      }
    } catch (err) {
      console.error('Failed to generate study schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleHoursChange = (h) => {
    setHoursPerDay(h);
    api.post('/timetable', { schedule, hoursPerDay: h }).catch(() => {});
    api.post('/ai-predict', { study_hours: h }).then(({ data }) => setAiPrediction(data)).catch(() => {});
  };

  const toggleSessionComplete = (item) => {
    const nextCompleted = !item.completed;
    const updated = schedule.map((s) => {
      if (
        s.date === item.date &&
        s.subject === item.subject &&
        (s.topic || '') === (item.topic || '')
      ) {
        const allSubtopics = Array.isArray(s.subtopics) ? s.subtopics : [];
        return {
          ...s,
          completed: nextCompleted,
          completedSubtopics: nextCompleted ? [...allSubtopics] : [],
        };
      }
      return s;
    });
    saveSchedule(updated);
  };

  const toggleSubtopic = (item, subtopicText) => {
    const updated = schedule.map((s) => {
      if (
        s.date === item.date &&
        s.subject === item.subject &&
        (s.topic || '') === (item.topic || '')
      ) {
        const currentCompleted = Array.isArray(s.completedSubtopics) ? s.completedSubtopics : [];
        const isAlreadyDone = currentCompleted.includes(subtopicText);
        const nextCompleted = isAlreadyDone
          ? currentCompleted.filter((t) => t !== subtopicText)
          : [...currentCompleted, subtopicText];

        const allSubtopics = Array.isArray(s.subtopics) ? s.subtopics : [];
        const allDone = allSubtopics.length > 0 && nextCompleted.length >= allSubtopics.length;

        return {
          ...s,
          completedSubtopics: nextCompleted,
          completed: allDone,
        };
      }
      return s;
    });
    saveSchedule(updated);
  };

  const handleAddSession = () => {
    setModal({
      type: 'add',
      dateStr: selectedDateStr,
      subject: subjects[0] || 'General Studies',
      topic: '',
      learningGoal: '',
      technique: 'Pomodoro (50m Focus + 10m Break)',
      subtopicsText: 'Review foundational notes\nSolve 3 practice questions\nSummarize tricky concepts',
      duration: '2 hours',
      priority: 'high',
    });
  };

  const handleEditSession = (item) => {
    const subtopicsList = Array.isArray(item.subtopics) ? item.subtopics : [];
    setModal({
      type: 'edit',
      item,
      dateStr: item.date,
      subject: item.subject,
      topic: item.topic || '',
      learningGoal: item.learningGoal || '',
      technique: item.technique || 'Pomodoro (50m Focus + 10m Break)',
      subtopicsText: subtopicsList.join('\n'),
      duration: item.duration || '2 hours',
      priority: item.priority || 'medium',
    });
  };

  const handleDeleteSession = (item) => {
    const updated = schedule.filter(
      (s) =>
        !(
          s.date === item.date &&
          s.subject === item.subject &&
          (s.topic || '') === (item.topic || '') &&
          s.duration === item.duration
        )
    );
    saveSchedule(updated);
  };

  const handleModalSubmit = () => {
    if (!modal) return;
    const { type, dateStr, subject, topic, learningGoal, technique, subtopicsText, duration, priority } = modal;
    const parsedSubtopics = (subtopicsText || '')
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    if (type === 'add') {
      const newItem = {
        date: dateStr,
        subject,
        topic: topic.trim() || `${subject}: Focused Study Session`,
        learningGoal: learningGoal.trim() || `Master core principles and problem solving for ${subject}.`,
        technique: technique.trim() || 'Pomodoro (50m Focus + 10m Break)',
        subtopics: parsedSubtopics.length > 0 ? parsedSubtopics : ['Review study notes', 'Solve practice problems'],
        completedSubtopics: [],
        duration: duration || '2 hours',
        priority: priority || 'medium',
        completed: false,
      };
      const updated = [...schedule, newItem];
      saveSchedule(updated);
    } else {
      const old = modal.item;
      const updated = schedule.map((s) => {
        if (
          s.date === old.date &&
          s.subject === old.subject &&
          (s.topic || '') === (old.topic || '') &&
          s.duration === old.duration
        ) {
          return {
            ...s,
            subject,
            topic: topic.trim() || s.topic,
            learningGoal: learningGoal.trim() || s.learningGoal,
            technique: technique.trim() || s.technique,
            subtopics: parsedSubtopics.length > 0 ? parsedSubtopics : s.subtopics,
            duration,
            priority,
          };
        }
        return s;
      });
      saveSchedule(updated);
    }
  };

  const changeDay = (delta) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta);
      return next;
    });
  };

  // Day stats
  const totalDaySessions = dayBlocks.length;
  const completedDaySessions = dayBlocks.filter((b) => b.completed).length;
  const dayProgressPct = totalDaySessions > 0 ? Math.round((completedDaySessions / totalDaySessions) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-[#F4F4F6]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashHeader title="Timetable" />

        <div className="p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          {/* Top Control Bar: Title, View Switcher & AI Generate */}
          <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-5 shadow-[3px_3px_0_#0D0D0D] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[14px] bg-[#FFFF66] border-2 border-[#0D0D0D] flex items-center justify-center shadow-[2px_2px_0_#0D0D0D]">
                <Calendar size={24} className="text-[#0D0D0D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-[#0D0D0D]">Personalized AI Study Timetable</h1>
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#FFB6C1] border border-[#0D0D0D] text-[#0D0D0D]">
                    14-Day Plan
                  </span>
                </div>
                <p className="text-xs text-[#555555] mt-0.5">
                  AI-balanced workload based on your subjects, exam dates, and quiz scores.
                </p>
              </div>
            </div>

            {/* View Mode & AI Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-[#F0F0F2] p-1 rounded-[12px] border-2 border-[#0D0D0D] flex items-center">
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                    viewMode === 'day'
                      ? 'bg-[#0D0D0D] text-[#FFFF66] shadow-[1px_1px_0_#0D0D0D]'
                      : 'text-[#555555] hover:text-[#0D0D0D]'
                  }`}
                >
                  Day Plan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('roadmap')}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'roadmap'
                      ? 'bg-[#0D0D0D] text-[#FFFF66] shadow-[1px_1px_0_#0D0D0D]'
                      : 'text-[#555555] hover:text-[#0D0D0D]'
                  }`}
                >
                  <Layers size={13} />
                  14-Day Roadmap
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loadingSchedule}
                className="px-4 py-2 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[10px] font-display text-xs font-bold hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#0D0D0D] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} className={loadingSchedule ? 'animate-spin' : ''} />
                {loadingSchedule ? 'Generating Plan…' : 'Generate with AI'}
              </button>
            </div>
          </div>

          {/* AI Reasoning Summary Banner (A* Search & Predicted Performance) */}
          {aiPrediction && (
            <div className="bg-[#0D0D0D] text-white border-2 border-[#0D0D0D] rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-3 shadow-[3px_3px_0_#0D0D0D] animate-fadeUp">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[12px] bg-[#87CEEB] text-[#0D0D0D] flex items-center justify-center font-bold flex-shrink-0">
                  <Route size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-black uppercase text-[#FFFF66] tracking-wide">
                      A* Study Sequence
                    </span>
                    <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase font-mono">
                      Unit II
                    </span>
                  </div>
                  {aiPrediction.study_path?.path?.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                      {aiPrediction.study_path.path.map((subj, idx) => (
                        <div key={subj} className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] bg-white/10 text-xs font-bold text-white border border-white/15">
                            <span className="text-[#87CEEB] font-mono">{idx + 1}.</span>
                            <span>{subj}</span>
                          </span>
                          {idx < aiPrediction.study_path.path.length - 1 && (
                            <span className="text-white/40 text-xs">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-white/60">Balanced across subjects</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-[10px] bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                  <span className="text-white/50">Optimal:</span>
                  <strong className="text-[#FFFF66] font-bold">{aiPrediction.recommended_hours}h/day</strong>
                </div>
                <div className="px-3 py-1.5 rounded-[10px] bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                  <span className="text-white/50">Est. Score:</span>
                  <strong className="text-[#87CEEB] font-bold">{aiPrediction.predicted_performance}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Interactive 14-Day Strip */}
          <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-4 shadow-[3px_3px_0_#0D0D0D]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0D0D0D]">14-Day Timeline</span>
                <span className="text-[11px] text-[#777777]">Click any day to inspect and study</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => changeDay(-1)}
                  className="p-1.5 border-2 border-[#0D0D0D] rounded-[8px] hover:bg-[#F0F0F0] transition-colors"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="px-2.5 py-1 border-2 border-[#0D0D0D] rounded-full text-[11px] font-bold hover:bg-[#F0F0F0] transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => changeDay(1)}
                  className="p-1.5 border-2 border-[#0D0D0D] rounded-[8px] hover:bg-[#F0F0F0] transition-colors"
                  aria-label="Next day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {fourteenDays.map((d) => {
                const isSelected = d.dateStr === selectedDateStr;
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.date);
                      setViewMode('day');
                    }}
                    className={`flex-shrink-0 w-[72px] py-2.5 px-2 rounded-[14px] border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0D0D0D] text-white border-[#0D0D0D] shadow-[2px_2px_0_#0D0D0D] -translate-y-0.5'
                        : d.isToday
                        ? 'bg-[#FFFF66]/40 text-[#0D0D0D] border-[#0D0D0D] hover:bg-[#FFFF66]/70'
                        : 'bg-white text-[#333333] border-[#0D0D0D]/20 hover:border-[#0D0D0D] hover:bg-[#F7F7F9]'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white/60' : 'text-[#888888]'}`}>
                      {d.weekday}
                    </span>
                    <span className="text-base font-extrabold font-display leading-tight">{d.dayNum}</span>
                    <span className={`text-[9px] font-semibold ${isSelected ? 'text-white/50' : 'text-[#888888]'}`}>
                      {d.month}
                    </span>

                    {/* Status badge */}
                    <div className="mt-0.5">
                      {d.isCompleted ? (
                        <CheckCircle2 size={13} className="text-[#22c55e]" />
                      ) : d.hasSessions ? (
                        <span
                          className={`w-2 h-2 rounded-full block ${
                            isSelected ? 'bg-[#FFFF66]' : 'bg-[#0D0D0D]'
                          }`}
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full block bg-black/15" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW: DAY VIEW */}
          {viewMode === 'day' && (
            <div className="flex flex-col gap-6">
              {/* Daily Overview Hero Card */}
              <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-6 shadow-[3px_3px_0_#0D0D0D] flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#777777] uppercase tracking-wide">
                      {selectedDateStr === todayStr ? 'Today’s Schedule' : 'Selected Day Plan'}
                    </span>
                    {selectedDateStr === todayStr && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFFF66] border border-[#0D0D0D]">
                        Active Today
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-[#0D0D0D]">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h2>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-48 h-2.5 bg-[#F0F0F2] rounded-full border border-[#0D0D0D] overflow-hidden">
                      <div
                        className="h-full bg-[#22c55e] transition-all duration-300"
                        style={{ width: `${dayProgressPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#0D0D0D]">
                      {completedDaySessions} / {totalDaySessions} Done ({dayProgressPct}%)
                    </span>
                  </div>
                </div>

                {/* Right controls: Study target hours & Add button */}
                <div className="flex flex-col items-start md:items-end gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#666666]">Daily Goal:</span>
                    {[1, 2, 3, 4, 5, 6].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHoursChange(h)}
                        className={`px-2.5 py-1 border-2 rounded-[8px] text-xs font-bold transition-all ${
                          hoursPerDay === h
                            ? 'bg-[#0D0D0D] text-[#FFFF66] border-[#0D0D0D]'
                            : 'bg-white border-[#0D0D0D]/30 hover:border-[#0D0D0D] text-[#0D0D0D]'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddSession}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-2 border-[#0D0D0D] rounded-[10px] bg-[#FFB6C1] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0D0D0D] transition-all cursor-pointer"
                    >
                      <Plus size={15} /> Add Session
                    </button>
                  </div>
                </div>
              </div>

              {/* Day Study Blocks List */}
              <div className="flex flex-col gap-4">
                {dayBlocks.length === 0 && !loadingSchedule && (
                  <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-10 text-center shadow-[3px_3px_0_#0D0D0D]">
                    <div className="w-14 h-14 rounded-full bg-[#FFFF66] border-2 border-[#0D0D0D] flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0_#0D0D0D]">
                      <Calendar size={24} className="text-[#0D0D0D]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0D0D0D]">No Study Sessions For This Day</h3>
                    <p className="text-xs text-[#666666] max-w-md mx-auto mt-1 mb-5">
                      Click &quot;Generate with AI&quot; to build a personalized 14-day study plan, or add a custom study block manually.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="px-4 py-2 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[10px] text-xs font-bold hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0D0D0D] transition-all flex items-center gap-1.5"
                      >
                        <Sparkles size={14} /> Generate 14-Day AI Schedule
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSession}
                        className="px-4 py-2 bg-white border-2 border-[#0D0D0D] rounded-[10px] text-xs font-bold hover:bg-[#F5F5F7] transition-all"
                      >
                        + Add Custom Session
                      </button>
                    </div>
                  </div>
                )}

                {dayBlocks.map((block) => {
                  const theme = PRIORITY_THEMES[block.priority] || PRIORITY_THEMES.medium;
                  const isDone = block.completed;
                  const emoji = getSubjectEmoji(block.subject);
                  const subtopics = Array.isArray(block.subtopics) ? block.subtopics : [];
                  const completedSubtopics = Array.isArray(block.completedSubtopics) ? block.completedSubtopics : [];

                  return (
                    <div
                      key={block.id}
                      className={`bg-white border-2 border-[#0D0D0D] rounded-[20px] p-5 shadow-[4px_4px_0_#0D0D0D] transition-all relative overflow-hidden ${
                        isDone ? 'bg-[#FAFAFA] opacity-90' : ''
                      }`}
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2.5"
                        style={{ backgroundColor: theme.bg }}
                      />

                      <div className="pl-2">
                        {/* Session Top Bar: Time, Subject, Priority & Status Toggle */}
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Time badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-[#0D0D0D] text-[#FFFF66] text-xs font-bold">
                              <Clock size={12} />
                              {block.startHour}:00 – {block.endHour}:00 ({block.duration})
                            </span>

                            {/* Subject pill */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#0D0D0D] bg-white text-xs font-bold shadow-[1px_1px_0_#0D0D0D]">
                              <span>{emoji}</span>
                              <span>{block.subject}</span>
                            </span>

                            {/* Priority pill */}
                            <span
                              className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#0D0D0D]"
                              style={{ backgroundColor: theme.bg }}
                            >
                              {theme.label}
                            </span>
                          </div>

                          {/* Complete Toggle Button */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleSessionComplete(block)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#0D0D0D] text-xs font-bold transition-all cursor-pointer ${
                                isDone
                                  ? 'bg-[#22c55e] text-white shadow-[1px_1px_0_#0D0D0D]'
                                  : 'bg-white hover:bg-[#F0FDF4] text-[#0D0D0D]'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 size={14} /> Completed
                                </>
                              ) : (
                                <>
                                  <Circle size={14} className="text-[#888888]" /> Mark Complete
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditSession(block)}
                              className="p-1.5 rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-[#F0F0F0] text-[#0D0D0D]"
                              title="Edit Session"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(block)}
                              className="p-1.5 rounded-[8px] border-2 border-[#0D0D0D] bg-white hover:bg-red-50 text-red-600"
                              title="Delete Session"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Topic Title */}
                        <h3 className={`text-lg font-black text-[#0D0D0D] mb-2 ${isDone ? 'line-through text-[#777777]' : ''}`}>
                          {block.topic}
                        </h3>

                        {/* Learning Goal Banner */}
                        {block.learningGoal && (
                          <div className="mb-3.5 bg-[#F8F8FA] border border-[#0D0D0D]/15 rounded-[12px] p-3 flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[#FFFF66] border border-[#0D0D0D] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Target size={13} className="text-[#0D0D0D]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#777777] block">
                                Actionable Learning Goal
                              </span>
                              <p className="text-xs font-semibold text-[#0D0D0D] mt-0.5 leading-relaxed">
                                {block.learningGoal}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Technique Tag */}
                        {block.technique && (
                          <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                            <span className="text-[11px] font-bold text-[#666666] flex items-center gap-1">
                              <Lightbulb size={13} className="text-[#8a8400]" /> Recommended Method:
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFF66]/30 border border-[#0D0D0D]/20 text-[11px] font-bold text-[#0D0D0D]">
                              {block.technique}
                            </span>
                          </div>
                        )}

                        {/* Actionable Subtasks Checklist */}
                        {subtopics.length > 0 && (
                          <div className="mb-4">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#777777] block mb-2">
                              Study Checkpoints ({completedSubtopics.length}/{subtopics.length})
                            </span>
                            <div className="flex flex-col gap-1.5">
                              {subtopics.map((sub, sIdx) => {
                                const isSubDone = completedSubtopics.includes(sub);
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => toggleSubtopic(block, sub)}
                                    className={`w-full text-left flex items-start gap-2.5 p-2 rounded-[10px] border transition-all cursor-pointer ${
                                      isSubDone
                                        ? 'bg-[#F0FDF4] border-[#22c55e]/40 text-[#166534]'
                                        : 'bg-white border-[#0D0D0D]/10 hover:border-[#0D0D0D]/30 text-[#0D0D0D]'
                                    }`}
                                  >
                                    <div className="mt-0.5 flex-shrink-0">
                                      {isSubDone ? (
                                        <CheckSquare size={15} className="text-[#22c55e]" />
                                      ) : (
                                        <Square size={15} className="text-[#999999]" />
                                      )}
                                    </div>
                                    <span className={`text-xs font-semibold ${isSubDone ? 'line-through text-[#666666]' : ''}`}>
                                      {sub}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action Shortcuts Footer */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#0D0D0D]/10 flex-wrap">
                          <button
                            type="button"
                            onClick={() => navigate('/quiz')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#0D0D0D] text-xs font-bold text-[#0D0D0D] hover:bg-[#F5F5F7] transition-all cursor-pointer shadow-[1px_1px_0_#0D0D0D]"
                          >
                            <Brain size={13} /> Take Quiz in {block.subject}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/subject/${encodeURIComponent(block.subject)}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#0D0D0D] text-xs font-bold text-[#0D0D0D] hover:bg-[#F5F5F7] transition-all cursor-pointer shadow-[1px_1px_0_#0D0D0D]"
                          >
                            <BookOpen size={13} /> View Study Materials
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: 14-DAY ROADMAP VIEW */}
          {viewMode === 'roadmap' && (
            <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-6 shadow-[3px_3px_0_#0D0D0D]">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#0D0D0D]">14-Day Comprehensive Study Roadmap</h2>
                  <p className="text-xs text-[#555555] mt-0.5">
                    Your complete two-week master plan. Click on any day to open its checkpoints and practice sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className="px-3.5 py-1.5 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[8px] text-xs font-bold"
                >
                  ← Back to Day View
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fourteenDays.map((d, idx) => {
                  const daySessions = (schedule || []).filter((s) => s.date === d.dateStr);
                  const isDayDone = daySessions.length > 0 && daySessions.every((s) => s.completed);

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => {
                        setSelectedDate(d.date);
                        setViewMode('day');
                      }}
                      className={`border-2 border-[#0D0D0D] rounded-[16px] p-4 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-[4px_4px_0_#0D0D0D] ${
                        d.isToday
                          ? 'bg-[#FFFF66]/20 shadow-[2px_2px_0_#0D0D0D]'
                          : isDayDone
                          ? 'bg-[#F0FDF4]'
                          : 'bg-white shadow-[2px_2px_0_#0D0D0D]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-[#0D0D0D]">
                            Day {idx + 1} · {d.weekday}
                          </span>
                          {d.isToday && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFFF66] border border-[#0D0D0D]">
                              TODAY
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#777777]">
                          {d.dayNum} {d.month}
                        </span>
                      </div>

                      {daySessions.length === 0 ? (
                        <p className="text-xs text-[#999999] py-3 italic">No sessions planned</p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2">
                          {daySessions.map((s, sIdx) => {
                            const theme = PRIORITY_THEMES[s.priority] || PRIORITY_THEMES.medium;
                            const emoji = getSubjectEmoji(s.subject);
                            return (
                              <div
                                key={sIdx}
                                className="bg-white/80 border border-[#0D0D0D]/20 rounded-[10px] p-2 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold flex items-center gap-1">
                                    <span>{emoji}</span> {s.subject}
                                  </span>
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-[#0D0D0D]"
                                    style={{ backgroundColor: theme.bg }}
                                  >
                                    {s.priority}
                                  </span>
                                </div>
                                <p className={`text-[11px] text-[#444444] line-clamp-1 ${s.completed ? 'line-through text-[#999999]' : ''}`}>
                                  {s.topic}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-[#0D0D0D]/10 flex items-center justify-between text-[11px] font-bold text-[#0D0D0D]">
                        <span>{daySessions.length} session{daySessions.length === 1 ? '' : 's'}</span>
                        <span className="flex items-center gap-1 text-[#0D0D0D] hover:underline">
                          View details <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Session Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeUp backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-6 max-w-lg w-full shadow-[6px_6px_0_#0D0D0D] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#0D0D0D]/10">
              <h3 className="text-lg font-black text-[#0D0D0D]">
                {modal.type === 'add' ? 'Add Study Session' : 'Edit Study Session'}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-7 h-7 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center font-bold text-sm hover:bg-[#F0F0F0]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-[#555555] block mb-1">Subject</label>
                <select
                  value={modal.subject}
                  onChange={(e) => setModal((m) => ({ ...m, subject: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm font-semibold bg-white"
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {!subjects.includes(modal.subject) && (
                    <option value={modal.subject}>{modal.subject}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#555555] block mb-1">Topic Name / Chapter</label>
                <input
                  type="text"
                  value={modal.topic}
                  onChange={(e) => setModal((m) => ({ ...m, topic: e.target.value }))}
                  placeholder="e.g. Dynamic Programming & Recursion"
                  className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#555555] block mb-1">Learning Goal</label>
                <input
                  type="text"
                  value={modal.learningGoal}
                  onChange={(e) => setModal((m) => ({ ...m, learningGoal: e.target.value }))}
                  placeholder="e.g. Master memoization and solve 3 standard knapsack problems"
                  className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#555555] block mb-1">Study Technique</label>
                <select
                  value={modal.technique}
                  onChange={(e) => setModal((m) => ({ ...m, technique: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm font-semibold bg-white"
                >
                  <option value="Pomodoro (50m Focus + 10m Break)">Pomodoro (50m Focus + 10m Break)</option>
                  <option value="Active Recall & Practice Testing">Active Recall & Practice Testing</option>
                  <option value="Feynman Technique & Note Synthesis">Feynman Technique & Note Synthesis</option>
                  <option value="Interleaved Problem Solving">Interleaved Problem Solving</option>
                  <option value="Spaced Repetition Flashcards">Spaced Repetition Flashcards</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#555555] block mb-1">
                  Study Checkpoints / Subtasks (1 per line)
                </label>
                <textarea
                  rows={3}
                  value={modal.subtopicsText}
                  onChange={(e) => setModal((m) => ({ ...m, subtopicsText: e.target.value }))}
                  placeholder="Review lecture formulas&#10;Solve 5 textbook problems&#10;Test recall without notes"
                  className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#555555] block mb-1">Duration</label>
                  <select
                    value={modal.duration}
                    onChange={(e) => setModal((m) => ({ ...m, duration: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm font-semibold bg-white"
                  >
                    <option value="1 hour">1 hour</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours">3 hours</option>
                    <option value="4 hours">4 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#555555] block mb-1">Priority</label>
                  <select
                    value={modal.priority}
                    onChange={(e) => setModal((m) => ({ ...m, priority: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-[#0D0D0D] rounded-[10px] text-sm font-semibold bg-white"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-3 border-t border-[#0D0D0D]/10">
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[10px] font-bold text-xs hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#0D0D0D] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save Session'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 border-2 border-[#0D0D0D] rounded-[10px] font-bold text-xs hover:bg-[#F0F0F0] transition-colors"
              >
                Cancel
              </button>
              {modal.type === 'edit' && (
                <button
                  type="button"
                  onClick={() => handleDeleteSession(modal.item)}
                  disabled={saving}
                  className="px-3.5 py-2.5 border-2 border-red-500 text-red-600 rounded-[10px] font-bold text-xs ml-auto hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
