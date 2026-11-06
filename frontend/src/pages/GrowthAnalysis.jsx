import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashHeader from '../components/DashHeader';
import { useAuth } from '../context/AuthContext';
import { analyzeGrowth } from '../utils/ai';
import api from '../utils/api';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Plus,
  Sparkles,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BookOpen,
  Brain,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';

const POPULAR_SUBJECT_PRESETS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Biology',
  'English Literature',
  'Economics',
  'History',
];

export default function GrowthAnalysis() {
  const { eduData } = useAuth();
  const navigate = useNavigate();

  // Active view: 'deep-dive' | 'all-subjects'
  const [activeTab, setActiveTab] = useState('deep-dive');

  // Subjects resolution
  const userSubjects = useMemo(() => eduData?.subjects || [], [eduData]);
  const [customSubjects, setCustomSubjects] = useState([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);

  // All combined subjects
  const allSubjects = useMemo(() => {
    const list = [...userSubjects, ...customSubjects];
    return Array.from(new Set(list.filter(Boolean)));
  }, [userSubjects, customSubjects]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [scores, setScores] = useState([
    { label: 'Quiz 1', score: '', date: new Date().toISOString().split('T')[0] },
    { label: 'Quiz 2', score: '', date: new Date().toISOString().split('T')[0] },
  ]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [availableQuizCount, setAvailableQuizCount] = useState(0);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [allGrowthRecords, setAllGrowthRecords] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Sync selectedSubject when subjects list updates or on mount
  useEffect(() => {
    if (!selectedSubject && allSubjects.length > 0) {
      setSelectedSubject(allSubjects[0]);
    } else if (selectedSubject && !allSubjects.includes(selectedSubject) && allSubjects.length > 0) {
      // keep current selection if valid or switch
    }
  }, [allSubjects, selectedSubject]);

  // Load all user growth records for cross-subject analytics
  const loadAllGrowth = () => {
    api.get('/growth')
      .then(({ data }) => {
        if (data.growth && Array.isArray(data.growth)) {
          setAllGrowthRecords(data.growth);
          // Also discover subjects that had records saved
          const savedSubjectNames = data.growth.map((g) => g.subject).filter(Boolean);
          setCustomSubjects((prev) => Array.from(new Set([...prev, ...savedSubjectNames])));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAllGrowth();
  }, []);

  // When subject changes, fetch saved growth data and available quiz attempts
  useEffect(() => {
    if (!selectedSubject) return;

    setPageLoading(true);
    setValidationError('');

    // 1. Fetch saved growth data
    const fetchGrowth = api.get(`/growth/${encodeURIComponent(selectedSubject)}`)
      .then(({ data }) => {
        if (data.growth?.scores?.length) {
          setScores(
            data.growth.scores.map((s) => ({
              label: s.label || 'Test',
              score: s.score ?? '',
              date: s.date || new Date().toISOString().split('T')[0],
            }))
          );
        } else {
          setScores([
            { label: 'Quiz 1', score: '', date: new Date().toISOString().split('T')[0] },
            { label: 'Quiz 2', score: '', date: new Date().toISOString().split('T')[0] },
          ]);
        }
        if (data.growth?.analysis) {
          setAnalysis(data.growth.analysis);
        } else {
          setAnalysis(null);
        }
      })
      .catch(() => {});

    // 2. Fetch quiz attempts for this subject
    const fetchQuizzes = api.get(`/quiz/${encodeURIComponent(selectedSubject)}`)
      .then(({ data }) => {
        if (data.attempts && Array.isArray(data.attempts)) {
          setQuizAttempts(data.attempts);
          setAvailableQuizCount(data.attempts.length);
        } else {
          setQuizAttempts([]);
          setAvailableQuizCount(0);
        }
      })
      .catch(() => {
        setQuizAttempts([]);
        setAvailableQuizCount(0);
      });

    Promise.allSettled([fetchGrowth, fetchQuizzes]).finally(() => {
      setPageLoading(false);
    });
  }, [selectedSubject]);

  // Score row manipulators
  const updateScore = (index, field, value) => {
    setValidationError('');
    setScores((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        let sanitizedVal = value;
        if (field === 'score') {
          if (value === '') sanitizedVal = '';
          else {
            const num = Number(value);
            sanitizedVal = isNaN(num) ? '' : Math.max(0, Math.min(100, num));
          }
        }
        return { ...item, [field]: sanitizedVal };
      })
    );
  };

  const addScore = () => {
    setValidationError('');
    setScores((prev) => [
      ...prev,
      {
        label: `Quiz ${prev.length + 1}`,
        score: '',
        date: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const removeScore = (index) => {
    setScores((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.length === 0
        ? [{ label: 'Quiz 1', score: '', date: new Date().toISOString().split('T')[0] }]
        : filtered;
    });
    showToast('Score entry removed');
  };

  const applyPresetLabel = (index, preset) => {
    updateScore(index, 'label', preset);
  };

  // Sync/import quiz history from the STAI Quiz module
  const handleImportQuizzes = () => {
    if (!quizAttempts || quizAttempts.length === 0) {
      showToast('No quiz attempts found for this subject yet.');
      return;
    }

    setSyncLoading(true);
    // Sort attempts chronologically
    const sorted = [...quizAttempts].sort(
      (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
    );

    const importedScores = sorted.map((att, i) => ({
      label: `STAI Quiz #${i + 1} (${att.correct}/${att.total})`,
      score: Math.round(att.score ?? (att.correct / (att.total || 1)) * 100),
      date: att.date || att.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    }));

    setScores(importedScores);
    setSyncLoading(false);
    showToast(`Successfully imported ${importedScores.length} quiz scores!`);
  };

  // Populate sample demo scores so students can test immediately
  const handleLoadSampleData = () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 14);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 9);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 4);
    const d4 = new Date(today);

    setScores([
      { label: 'Unit 1 Diagnostic', score: 68, date: d1.toISOString().split('T')[0] },
      { label: 'Weekly Quiz 2', score: 76, date: d2.toISOString().split('T')[0] },
      { label: 'Mid-term Assessment', score: 84, date: d3.toISOString().split('T')[0] },
      { label: 'Comprehensive Review', score: 92, date: d4.toISOString().split('T')[0] },
    ]);
    showToast('Loaded sample test trajectory. Click "Analyze Growth" to test!');
  };

  // Add custom subject
  const handleAddCustomSubject = (subName) => {
    const trimmed = (subName || newSubjectInput).trim();
    if (!trimmed) return;
    if (!allSubjects.includes(trimmed)) {
      setCustomSubjects((prev) => [...prev, trimmed]);
    }
    setSelectedSubject(trimmed);
    setNewSubjectInput('');
    setShowAddSubject(false);
    showToast(`Subject "${trimmed}" selected`);
  };

  // Clear / reset subject data
  const handleResetSubject = async () => {
    if (!selectedSubject) return;
    if (!window.confirm(`Are you sure you want to reset all test data and analysis for ${selectedSubject}?`)) {
      return;
    }
    try {
      await api.delete(`/growth/${encodeURIComponent(selectedSubject)}`);
      setScores([
        { label: 'Quiz 1', score: '', date: new Date().toISOString().split('T')[0] },
        { label: 'Quiz 2', score: '', date: new Date().toISOString().split('T')[0] },
      ]);
      setAnalysis(null);
      loadAllGrowth();
      showToast(`Data for ${selectedSubject} has been reset.`);
    } catch {
      showToast('Could not reset data. Please try again.');
    }
  };

  // Validate and submit scores for AI analysis
  const handleAnalyze = async () => {
    const targetSubject = selectedSubject.trim();
    if (!targetSubject) {
      setValidationError('Please select or add a subject first.');
      return;
    }

    const filledScores = scores
      .filter((s) => s.score !== '' && s.score !== null && !isNaN(Number(s.score)))
      .map((s) => ({
        label: s.label.trim() || 'Test',
        score: Number(s.score),
        date: s.date || new Date().toISOString().split('T')[0],
      }));

    if (filledScores.length === 0) {
      setValidationError('Please enter at least one test score (0–100) before analyzing.');
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      const result = await analyzeGrowth(targetSubject, filledScores, [targetSubject]);
      setAnalysis(result);

      // Persist to backend MongoDB
      await api.post('/growth', {
        subject: targetSubject,
        scores: filledScores,
        analysis: result,
      });

      loadAllGrowth();
      showToast('Growth analysis updated and saved!');
    } catch (err) {
      console.error('Growth analysis failed:', err);
      // Fallback calculation locally if network fails
      const nums = filledScores.map((s) => s.score);
      const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
      const trend =
        nums.length >= 2
          ? nums[nums.length - 1] - nums[0] >= 4
            ? 'improving'
            : nums[nums.length - 1] - nums[0] <= -4
            ? 'declining'
            : 'stable'
          : avg >= 80
          ? 'improving'
          : 'stable';

      const fallbackResult = {
        overallScore: avg,
        trend,
        strengths: [
          `Consistent test completion and score tracking in ${targetSubject}`,
          avg >= 75 ? `Strong conceptual baseline across recent assessments` : `Regular quiz participation`,
        ],
        weaknesses: [
          `Multi-step question synthesis under timed constraints`,
          `Edge case definitions and variable edge tests`,
        ],
        suggestions: [
          `Dedicate 20 minutes daily to active recall on ${targetSubject}`,
          `Review answer keys immediately following quizzes to fix misconceptions`,
          `Take timed practice quizzes on STAI to strengthen time management`,
        ],
      };
      setAnalysis(fallbackResult);
      showToast('Analyzed with STAI dynamic analytics mentor.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics computation from valid scores
  const validScores = useMemo(() => {
    return scores
      .filter((s) => s.score !== '' && s.score !== null && !isNaN(Number(s.score)))
      .map((s) => ({
        label: s.label || 'Test',
        score: Number(s.score),
        date: s.date || '',
      }));
  }, [scores]);

  const stats = useMemo(() => {
    if (validScores.length === 0) {
      return { avg: 0, max: 0, min: 0, latest: 0, delta: 0, trend: 'stable', grade: '—' };
    }
    const nums = validScores.map((s) => s.score);
    const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    const latest = nums[nums.length - 1];
    const first = nums[0];
    const delta = nums.length >= 2 ? latest - first : 0;

    let trend = 'stable';
    if (delta >= 4) trend = 'improving';
    else if (delta <= -4) trend = 'declining';
    else if (avg >= 80) trend = 'improving';

    let grade = 'Needs Focus';
    if (avg >= 90) grade = 'Mastery (A+)';
    else if (avg >= 80) grade = 'Proficient (A)';
    else if (avg >= 70) grade = 'Solid (B)';
    else if (avg >= 60) grade = 'Fair (C)';

    return { avg, max, min, latest, delta, trend, grade };
  }, [validScores]);

  // SVG Chart Dimensions & Calculation
  const chartConfig = useMemo(() => {
    const width = 640;
    const height = 220;
    const paddingX = 40;
    const paddingY = 30;

    if (validScores.length === 0) return null;

    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    const points = validScores.map((s, idx) => {
      const x =
        validScores.length === 1
          ? width / 2
          : paddingX + (idx / (validScores.length - 1)) * plotWidth;
      const y = height - paddingY - (s.score / 100) * plotHeight;
      return { x, y, score: s.score, label: s.label, date: s.date };
    });

    const pathData = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Area fill path down to the baseline
    const baselineY = height - paddingY;
    const areaPath =
      points.length > 1
        ? `${pathData} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
        : '';

    // Target benchmark line at 80%
    const targetY = height - paddingY - (80 / 100) * plotHeight;

    return { width, height, paddingX, paddingY, points, pathData, areaPath, targetY, baselineY };
  }, [validScores]);

  const activeTrend = analysis?.trend || stats.trend;
  const TrendIcon = activeTrend === 'improving' ? TrendingUp : activeTrend === 'declining' ? TrendingDown : Minus;
  const trendColor = activeTrend === 'improving' ? '#16a34a' : activeTrend === 'declining' ? '#dc2626' : '#64748b';
  const trendBg = activeTrend === 'improving' ? '#dcfce7' : activeTrend === 'declining' ? '#fee2e2' : '#f1f5f9';

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-[#F9F9F9]">
        <DashHeader title="Growth Analysis" />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0D0D0D] text-[#FFFF66] rounded-[12px] shadow-lg border-2 border-[#FFFF66] animate-fadeUp text-sm font-semibold">
            <CheckCircle2 size={18} className="text-[#FFFF66]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="p-8 flex flex-col gap-6 flex-1 max-md:p-4">
          {/* Top Banner & Mode Switcher */}
          <div className="bg-[#0D0D0D] text-white rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#0D0D0D] shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFF66] text-[#0D0D0D]">
                  📊 Performance AI
                </span>
                <span className="text-xs text-white/50">Continuous Score Tracking</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Growth & Progress Analysis</h1>
              <p className="text-sm text-white/70 max-w-xl mt-1">
                Log quiz and exam scores to generate interactive score trajectories, diagnose strengths & weaknesses, and build adaptive study strategies.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/10 p-1 rounded-[12px] border border-white/20 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('deep-dive')}
                className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-bold transition-all ${
                  activeTab === 'deep-dive'
                    ? 'bg-[#FFFF66] text-[#0D0D0D] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <BarChart2 size={14} />
                Subject Deep-Dive
              </button>
              <button
                onClick={() => setActiveTab('all-subjects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-xs font-bold transition-all ${
                  activeTab === 'all-subjects'
                    ? 'bg-[#FFFF66] text-[#0D0D0D] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Layers size={14} />
                All Subjects Overview
              </button>
            </div>
          </div>

          {/* VIEW 1: SUBJECT DEEP-DIVE */}
          {activeTab === 'deep-dive' && (
            <>
              {/* Subject Selector Bar */}
              <div className="bg-white border-2 border-[#0D0D0D] rounded-[20px] p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                      Active Subject
                    </span>
                    <span className="text-xs bg-[#F0F0F0] px-2 py-0.5 rounded-md font-semibold text-[#0D0D0D]">
                      {allSubjects.length} enrolled
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {availableQuizCount > 0 && (
                      <button
                        onClick={handleImportQuizzes}
                        disabled={syncLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dcfce7] border border-[#86efac] text-[#166534] rounded-[8px] text-xs font-bold hover:bg-[#bbf7d0] transition-colors"
                        title="Import scores from quizzes you took in STAI"
                      >
                        <Download size={13} />
                        {syncLoading ? 'Importing...' : `Import ${availableQuizCount} STAI Quiz${availableQuizCount > 1 ? 'zes' : ''}`}
                      </button>
                    )}
                    <button
                      onClick={handleLoadSampleData}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFACD] border border-[#fde047] text-[#854d0e] rounded-[8px] text-xs font-bold hover:bg-[#fef08a] transition-colors"
                    >
                      <Sparkles size={13} />
                      Try Sample Data
                    </button>
                    {validScores.length > 0 && (
                      <button
                        onClick={handleResetSubject}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#888888] hover:text-[#e11d48] transition-colors"
                        title="Reset scores for this subject"
                      >
                        <RefreshCw size={12} />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Subject Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {allSubjects.map((sub) => {
                    const isSelected = sub === selectedSubject;
                    const record = allGrowthRecords.find((r) => r.subject === sub);
                    const subTests = record?.scores?.length || 0;

                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition-all border-2 ${
                          isSelected
                            ? 'bg-[#0D0D0D] text-[#FFFF66] border-[#0D0D0D] shadow-[2px_2px_0_#FFFF66]'
                            : 'bg-white text-[#0D0D0D] border-[#E0E0E0] hover:border-[#0D0D0D]'
                        }`}
                      >
                        <span>{sub}</span>
                        {subTests > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                              isSelected ? 'bg-[#FFFF66] text-[#0D0D0D]' : 'bg-[#F0F0F0] text-[#555555]'
                            }`}
                          >
                            {subTests}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Add Custom Subject Toggle */}
                  {!showAddSubject ? (
                    <button
                      onClick={() => setShowAddSubject(true)}
                      className="flex items-center gap-1 px-3 py-2 rounded-[12px] text-xs font-bold border-2 border-dashed border-[#CCCCCC] text-[#555555] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
                    >
                      <Plus size={14} />
                      Add Subject
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-[#F9F9F9] p-1 rounded-[12px] border-2 border-[#0D0D0D]">
                      <input
                        type="text"
                        placeholder="e.g. Artificial Intelligence"
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSubject()}
                        className="px-2.5 py-1 text-xs outline-none bg-transparent w-44 font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddCustomSubject()}
                        className="px-2.5 py-1 bg-[#0D0D0D] text-[#FFFF66] rounded-[6px] text-xs font-bold"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddSubject(false)}
                        className="px-1.5 py-1 text-[#888888] hover:text-[#0D0D0D] text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Presets if no subjects enrolled */}
                {allSubjects.length === 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-[#E0E0E0]">
                    <p className="text-xs text-[#777777] mb-2 font-medium">
                      No subjects found in your profile yet. Pick a common subject to start:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SUBJECT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleAddCustomSubject(preset)}
                          className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-[#0D0D0D] hover:text-[#FFFF66] text-[#333333] text-xs font-semibold rounded-md transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white border-2 border-[#0D0D0D] rounded-[18px] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#777777] mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Average Score</span>
                    <Award size={16} className="text-[#0D0D0D]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-display font-extrabold text-[#0D0D0D]">
                      {stats.avg || 0}
                    </span>
                    <span className="text-xs font-semibold text-[#888888]">/ 100</span>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#555555]">
                    Based on {validScores.length} recorded {validScores.length === 1 ? 'test' : 'tests'}
                  </div>
                </div>

                <div className="bg-white border-2 border-[#0D0D0D] rounded-[18px] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#777777] mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Trajectory</span>
                    <TrendIcon size={16} style={{ color: trendColor }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-extrabold capitalize flex items-center gap-1"
                      style={{ backgroundColor: trendBg, color: trendColor }}
                    >
                      <TrendIcon size={13} />
                      {activeTrend}
                    </span>
                    {stats.delta !== 0 && (
                      <span className="text-xs font-bold" style={{ color: trendColor }}>
                        {stats.delta > 0 ? `+${stats.delta}` : stats.delta} pts
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#555555]">
                    {activeTrend === 'improving' ? 'Upward growth momentum' : activeTrend === 'declining' ? 'Needs revision reinforcement' : 'Consistent stability'}
                  </div>
                </div>

                <div className="bg-white border-2 border-[#0D0D0D] rounded-[18px] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#777777] mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Best / Lowest</span>
                    <Flame size={16} className="text-[#f97316]" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <span className="text-2xl font-display font-extrabold text-[#16a34a]">
                        {stats.max || 0}
                      </span>
                      <span className="text-[10px] text-[#888888] block">Peak</span>
                    </div>
                    <span className="text-lg text-[#CCCCCC]">/</span>
                    <div>
                      <span className="text-2xl font-display font-extrabold text-[#64748b]">
                        {stats.min || 0}
                      </span>
                      <span className="text-[10px] text-[#888888] block">Floor</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#555555]">
                    Spread: {stats.max - stats.min} points
                  </div>
                </div>

                <div className="bg-white border-2 border-[#0D0D0D] rounded-[18px] p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#777777] mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Academic Grade</span>
                    <Brain size={16} className="text-[#0D0D0D]" />
                  </div>
                  <div className="text-xl font-display font-extrabold text-[#0D0D0D] truncate">
                    {stats.grade}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#555555]">
                    Target: Mastery &gt; 80%
                  </div>
                </div>
              </div>

              {/* Main Content: Interactive SVG Chart & Score Input Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Visual Progress Chart (7 cols on lg) */}
                <div className="lg:col-span-7 bg-white border-2 border-[#0D0D0D] rounded-[24px] p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-[#0D0D0D] flex items-center gap-2">
                        <span>📈</span>
                        <span>Score Trajectory ({selectedSubject || 'Subject'})</span>
                      </h2>
                      <p className="text-xs text-[#666666] mt-0.5">
                        Interactive chronological progression with 80% mastery benchmark
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#0D0D0D] inline-block rounded" />
                        <span>Scores</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[#16a34a]">
                        <span className="w-3 h-0.5 border-t border-dashed border-[#16a34a] inline-block" />
                        <span>80% Goal</span>
                      </span>
                    </div>
                  </div>

                  {/* SVG Chart Container */}
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] bg-[#FAFAFA] rounded-[16px] border border-[#EBEBEB] p-3 relative overflow-hidden">
                    {validScores.length === 0 ? (
                      <div className="text-center py-10 px-4 flex flex-col items-center gap-2.5">
                        <span className="text-4xl">📊</span>
                        <p className="text-sm font-bold text-[#0D0D0D]">No scores recorded for {selectedSubject || 'this subject'} yet</p>
                        <p className="text-xs text-[#777777] max-w-sm">
                          Enter your recent quiz, test, or midterm scores in the table on the right to visualize your growth trajectory.
                        </p>
                        <button
                          onClick={handleLoadSampleData}
                          className="mt-2 px-4 py-2 bg-[#0D0D0D] text-[#FFFF66] rounded-[8px] text-xs font-bold hover:-translate-y-0.5 transition-transform"
                        >
                          Load Sample Data to Preview
                        </button>
                      </div>
                    ) : chartConfig ? (
                      <div className="w-full relative">
                        <svg
                          viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                          className="w-full h-auto overflow-visible select-none"
                        >
                          <defs>
                            <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FFFF66" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#FFFF66" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines (100, 75, 50, 25, 0) */}
                          {[100, 75, 50, 25, 0].map((val) => {
                            const plotHeight = chartConfig.height - chartConfig.paddingY * 2;
                            const y = chartConfig.height - chartConfig.paddingY - (val / 100) * plotHeight;
                            return (
                              <g key={val}>
                                <line
                                  x1={chartConfig.paddingX}
                                  y1={y}
                                  x2={chartConfig.width - chartConfig.paddingX}
                                  y2={y}
                                  stroke="#E5E5E5"
                                  strokeDasharray={val === 0 ? undefined : '2,3'}
                                  strokeWidth="1"
                                />
                                <text
                                  x={chartConfig.paddingX - 8}
                                  y={y + 3}
                                  textAnchor="end"
                                  className="text-[9px] fill-[#999999] font-medium"
                                >
                                  {val}%
                                </text>
                              </g>
                            );
                          })}

                          {/* 80% Benchmark Line */}
                          <line
                            x1={chartConfig.paddingX}
                            y1={chartConfig.targetY}
                            x2={chartConfig.width - chartConfig.paddingX}
                            y2={chartConfig.targetY}
                            stroke="#16a34a"
                            strokeDasharray="4,4"
                            strokeWidth="1.5"
                            opacity="0.8"
                          />
                          <text
                            x={chartConfig.width - chartConfig.paddingX}
                            y={chartConfig.targetY - 5}
                            textAnchor="end"
                            className="text-[9px] fill-[#16a34a] font-bold"
                          >
                            80% Mastery Benchmark
                          </text>

                          {/* Area Fill */}
                          {chartConfig.areaPath && (
                            <path d={chartConfig.areaPath} fill="url(#growthAreaGradient)" />
                          )}

                          {/* Polyline Path */}
                          {chartConfig.pathData && (
                            <path
                              d={chartConfig.pathData}
                              fill="none"
                              stroke="#0D0D0D"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Data Dots */}
                          {chartConfig.points.map((pt, idx) => {
                            const isHovered = hoveredPoint === idx;
                            const isGood = pt.score >= 80;
                            const isFair = pt.score >= 60;
                            const dotColor = isGood ? '#16a34a' : isFair ? '#f59e0b' : '#dc2626';

                            return (
                              <g
                                key={idx}
                                onMouseEnter={() => setHoveredPoint(idx)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                className="cursor-pointer"
                              >
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 8 : 5.5}
                                  fill="#FFFFFF"
                                  stroke={dotColor}
                                  strokeWidth={isHovered ? 3.5 : 2.5}
                                  className="transition-all duration-150"
                                />
                                {/* Value label above dot */}
                                <text
                                  x={pt.x}
                                  y={pt.y - 10}
                                  textAnchor="middle"
                                  className="text-[10px] font-extrabold fill-[#0D0D0D]"
                                >
                                  {pt.score}%
                                </text>
                                {/* X-axis label */}
                                <text
                                  x={pt.x}
                                  y={chartConfig.baselineY + 16}
                                  textAnchor="middle"
                                  className="text-[9px] font-bold fill-[#666666]"
                                >
                                  {pt.label.length > 12 ? pt.label.slice(0, 10) + '…' : pt.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Interactive Hover Tooltip */}
                        {hoveredPoint !== null && chartConfig.points[hoveredPoint] && (
                          <div className="mt-2 text-center bg-[#0D0D0D] text-[#FFFF66] px-3 py-1.5 rounded-lg text-xs font-semibold inline-block mx-auto shadow-sm">
                            <span className="font-bold">{chartConfig.points[hoveredPoint].label}</span>
                            <span className="mx-2 text-white/50">·</span>
                            <span>Score: {chartConfig.points[hoveredPoint].score}%</span>
                            {chartConfig.points[hoveredPoint].date && (
                              <>
                                <span className="mx-2 text-white/50">·</span>
                                <span className="text-white/80">{chartConfig.points[hoveredPoint].date}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Chart Footer Tip */}
                  <div className="mt-4 flex items-center justify-between text-xs text-[#777777] border-t border-[#F0F0F0] pt-3">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#0D0D0D]" />
                      Tip: Keep logging each quiz to monitor retention after study sessions.
                    </span>
                    <span className="font-semibold text-[#0D0D0D]">
                      {validScores.length} data point{validScores.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Score Input & Editor Card (5 cols on lg) */}
                <div className="lg:col-span-5 bg-white border-2 border-[#0D0D0D] rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-extrabold text-[#0D0D0D] flex items-center gap-2">
                        <span>📝</span>
                        <span>Scores for {selectedSubject || 'Subject'}</span>
                      </h2>
                      <span className="text-xs font-bold text-[#888888]">
                        Max 100%
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] mb-4">
                      Add quiz, test, and exam scores. Edit labels or delete any row.
                    </p>

                    {/* Validation Message */}
                    {validationError && (
                      <div className="mb-3 p-3 bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] rounded-[10px] text-xs font-semibold flex items-center gap-2 animate-fadeUp">
                        <AlertTriangle size={15} />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Table of Scores */}
                    <div className="border-2 border-[#0D0D0D] rounded-[14px] overflow-hidden mb-3.5">
                      <div className="grid grid-cols-12 bg-[#0D0D0D] px-3.5 py-2 text-[11px] font-bold text-[#FFFF66] uppercase tracking-wider">
                        <div className="col-span-7">Assessment / Test</div>
                        <div className="col-span-4 text-center">Score (%)</div>
                        <div className="col-span-1 text-center">Del</div>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto divide-y divide-[#EAEAEA]">
                        {scores.map((s, idx) => {
                          const numScore = Number(s.score);
                          const isGood = s.score !== '' && numScore >= 80;
                          const isFair = s.score !== '' && numScore >= 60;
                          const scoreColorClass =
                            s.score === ''
                              ? ''
                              : isGood
                              ? 'text-[#16a34a] font-extrabold'
                              : isFair
                              ? 'text-[#d97706] font-extrabold'
                              : 'text-[#dc2626] font-extrabold';

                          return (
                            <div key={idx} className="grid grid-cols-12 items-center gap-2 p-2 hover:bg-[#FAFAFA] transition-colors">
                              {/* Label Column */}
                              <div className="col-span-7 flex flex-col gap-1">
                                <input
                                  type="text"
                                  placeholder="e.g. Quiz 1, Midterm"
                                  value={s.label}
                                  onChange={(e) => updateScore(idx, 'label', e.target.value)}
                                  className="w-full px-2.5 py-1.5 border border-[#CCCCCC] rounded-[6px] text-xs font-medium outline-none focus:border-[#0D0D0D] transition-colors bg-white"
                                />
                                {/* Quick Label Chips */}
                                <div className="flex gap-1 overflow-x-auto py-0.5">
                                  {['Quiz', 'Unit Test', 'Midterm', 'Final'].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => applyPresetLabel(idx, `${preset} ${idx + 1}`)}
                                      className="text-[9px] px-1.5 py-0.5 bg-[#F0F0F0] hover:bg-[#0D0D0D] hover:text-[#FFFF66] text-[#555555] rounded font-semibold transition-colors whitespace-nowrap"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Score Input Column */}
                              <div className="col-span-4 flex items-center justify-center">
                                <div className="relative w-full">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0-100"
                                    value={s.score}
                                    onChange={(e) => updateScore(idx, 'score', e.target.value)}
                                    className={`w-full text-center px-2 py-1.5 border border-[#CCCCCC] rounded-[6px] text-xs outline-none focus:border-[#0D0D0D] transition-colors bg-white ${scoreColorClass}`}
                                  />
                                </div>
                              </div>

                              {/* Delete Button Column */}
                              <div className="col-span-1 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeScore(idx)}
                                  className="p-1 text-[#999999] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded transition-colors"
                                  title="Delete score"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Score Row Button */}
                      <button
                        type="button"
                        onClick={addScore}
                        className="w-full py-2.5 bg-[#F9F9F9] border-t border-dashed border-[#CCCCCC] text-xs font-bold text-[#0D0D0D] hover:bg-[#F0F0F0] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus size={14} />
                        Add Another Test Score
                      </button>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || pageLoading}
                      className="w-full py-3.5 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[10px] font-display text-sm font-bold hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.2)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Analyzing Growth Trajectory…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Run AI Growth Analysis</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-[11px] text-[#888888] px-1">
                      <span>Evaluated with STAI Intelligence Mentor</span>
                      {analysis?.updatedAt && (
                        <span>Last analyzed: {new Date(analysis.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Diagnostic Insights Section */}
              {analysis && (
                <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] p-8 shadow-sm animate-fadeUp">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#F0F0F0]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFF66] text-[#0D0D0D] border border-[#0D0D0D]">
                          AI Diagnosis
                        </span>
                        <span className="text-xs text-[#777777] font-semibold">
                          Subject: {selectedSubject}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-[#0D0D0D]">
                        Comprehensive Performance Evaluation
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-[#777777] uppercase font-bold block">
                          Trajectory Trend
                        </span>
                        <div
                          className="flex items-center gap-1.5 text-sm font-extrabold capitalize"
                          style={{ color: trendColor }}
                        >
                          <TrendIcon size={16} />
                          {analysis.trend}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Overall Score Dial (3 cols) */}
                    <div className="md:col-span-3 bg-[#FAFAFA] border-2 border-[#0D0D0D] rounded-[20px] p-6 flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-[#555555] mb-4">
                        Mastery Index
                      </p>

                      <div
                        className="w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center border-[3px] border-[#0D0D0D] shadow-[2px_2px_0_#0D0D0D] relative mb-3"
                        style={{
                          background: `conic-gradient(#FFFF66 calc(${analysis.overallScore || 0} * 1%), #E5E5E5 0)`,
                        }}
                      >
                        <div className="w-[94px] h-[94px] rounded-full bg-white flex flex-col items-center justify-center">
                          <span className="font-display text-3xl font-black text-[#0D0D0D]">
                            {analysis.overallScore || 0}
                          </span>
                          <span className="text-[10px] text-[#777777] font-bold">/ 100</span>
                        </div>
                      </div>

                      <span
                        className="px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5"
                        style={{ backgroundColor: trendBg, color: trendColor }}
                      >
                        <TrendIcon size={14} />
                        {analysis.trend?.charAt(0).toUpperCase() + analysis.trend?.slice(1)}
                      </span>
                    </div>

                    {/* Strengths & Weaknesses (9 cols) */}
                    <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div className="bg-[#f0fdf4] border-2 border-[#86efac] rounded-[20px] p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                            <h4 className="text-sm font-extrabold text-[#14532d]">
                              Demonstrated Strengths
                            </h4>
                          </div>

                          {analysis.strengths?.length ? (
                            <ul className="flex flex-col gap-2.5">
                              {analysis.strengths.map((str, i) => (
                                <li
                                  key={i}
                                  className="text-xs leading-relaxed text-[#166534] pl-4 relative before:content-['•'] before:absolute before:left-0 before:font-bold before:text-[#16a34a]"
                                >
                                  {str}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#555555]">
                              Add more quiz scores to unlock strength diagnostics.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Weaknesses */}
                      <div className="bg-[#fff1f2] border-2 border-[#fecdd3] rounded-[20px] p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 rounded-full bg-[#e11d48] text-white flex items-center justify-center text-xs font-bold">
                              !
                            </span>
                            <h4 className="text-sm font-extrabold text-[#881337]">
                              Target Improvement Areas
                            </h4>
                          </div>

                          {analysis.weaknesses?.length ? (
                            <ul className="flex flex-col gap-2.5">
                              {analysis.weaknesses.map((wk, i) => (
                                <li
                                  key={i}
                                  className="text-xs leading-relaxed text-[#9f1239] pl-4 relative before:content-['•'] before:absolute before:left-0 before:font-bold before:text-[#e11d48]"
                                >
                                  {wk}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#555555]">
                              No weak areas flagged. Keep up the high scores!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Strategic Action Plan */}
                  <div className="mt-6 bg-[#FFFACD] border-2 border-[#0D0D0D] rounded-[20px] p-6 shadow-[3px_3px_0_#0D0D0D]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">💡</span>
                      <h4 className="text-base font-extrabold text-[#0D0D0D]">
                        Personalized AI Action Plan for {selectedSubject}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {(analysis.suggestions || []).map((sug, i) => (
                        <div
                          key={i}
                          className="bg-white/80 p-3.5 rounded-[12px] border border-[#0D0D0D]/10 text-xs font-medium text-[#1A1A1A] leading-relaxed flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#0D0D0D] text-[#FFFF66] flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold">
                            {i + 1}
                          </span>
                          <span>{sug}</span>
                        </div>
                      ))}
                    </div>

                    {/* Direct Next Action Shortcuts */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#0D0D0D]/10">
                      <span className="text-xs font-bold text-[#555555]">
                        Recommended Next Steps:
                      </span>
                      <button
                        onClick={() => navigate('/quiz')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0D0D0D] text-[#FFFF66] rounded-[8px] text-xs font-bold hover:-translate-y-0.5 transition-transform"
                      >
                        <Brain size={13} />
                        Take Practice Quiz on {selectedSubject}
                        <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => navigate('/materials')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#0D0D0D] border-2 border-[#0D0D0D] rounded-[8px] text-xs font-bold hover:-translate-y-0.5 transition-transform"
                      >
                        <BookOpen size={13} />
                        Review Study Materials
                      </button>
                      <button
                        onClick={() => navigate('/questions')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#0D0D0D] border-2 border-[#0D0D0D] rounded-[8px] text-xs font-bold hover:-translate-y-0.5 transition-transform"
                      >
                        <Sparkles size={13} />
                        Generate Practice Questions
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW 2: ALL SUBJECTS OVERVIEW TAB */}
          {activeTab === 'all-subjects' && (
            <div className="flex flex-col gap-6 animate-fadeUp">
              <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0D0D0D]">
                      Cross-Subject Academic Overview
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">
                      Compare your proficiency, score trajectory, and study attention needed across all subjects.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('deep-dive')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0D0D0D] text-[#FFFF66] rounded-[10px] text-xs font-bold hover:-translate-y-0.5 transition-transform self-start sm:self-auto"
                  >
                    <BarChart2 size={13} />
                    View Subject Deep-Dive
                  </button>
                </div>

                {allSubjects.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <span className="text-4xl">📚</span>
                    <p className="text-sm font-bold text-[#0D0D0D]">No enrolled subjects yet</p>
                    <p className="text-xs text-[#777777] max-w-sm">
                      Switch to Subject Deep-Dive to add your first subject or set up your profile.
                    </p>
                    <button
                      onClick={() => setActiveTab('deep-dive')}
                      className="px-4 py-2 bg-[#0D0D0D] text-[#FFFF66] rounded-[8px] text-xs font-bold"
                    >
                      Add a Subject
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allSubjects.map((sub) => {
                      const record = allGrowthRecords.find((r) => r.subject === sub);
                      const subScores = record?.scores || [];
                      const nums = subScores.map((s) => Number(s.score)).filter((n) => !isNaN(n));
                      const avg =
                        nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
                      const trend = record?.stats?.trend || record?.analysis?.trend || (avg >= 80 ? 'improving' : 'stable');
                      const SubTrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
                      const subTrendColor = trend === 'improving' ? '#16a34a' : trend === 'declining' ? '#dc2626' : '#64748b';

                      return (
                        <div
                          key={sub}
                          onClick={() => {
                            setSelectedSubject(sub);
                            setActiveTab('deep-dive');
                          }}
                          className="bg-[#FAFAFA] border-2 border-[#0D0D0D] rounded-[18px] p-5 hover:-translate-y-1 hover:shadow-[3px_3px_0_#0D0D0D] cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-extrabold text-[#0D0D0D] truncate">
                                {sub}
                              </h4>
                              <span
                                className="flex items-center gap-1 text-[11px] font-bold capitalize"
                                style={{ color: subTrendColor }}
                              >
                                <SubTrendIcon size={13} />
                                {trend}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-3xl font-display font-extrabold text-[#0D0D0D]">
                                {avg || '—'}
                              </span>
                              {avg > 0 && <span className="text-xs text-[#777777] font-semibold">% avg</span>}
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, avg)}%`,
                                  backgroundColor: avg >= 80 ? '#16a34a' : avg >= 60 ? '#f59e0b' : '#dc2626',
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#777777] pt-2 border-t border-[#EBEBEB] mt-2">
                            <span>{subScores.length} test{subScores.length !== 1 ? 's' : ''} logged</span>
                            <span className="font-bold text-[#0D0D0D] flex items-center gap-0.5">
                              View Analysis <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
