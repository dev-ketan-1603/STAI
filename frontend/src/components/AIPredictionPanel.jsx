import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Clock,
  BookOpen,
  RefreshCw,
  Info,
  BarChart3,
  Route,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import api from '../utils/api';

function AccuracyBar({ value }) {
  const color = value >= 70 ? '#2d8a4e' : value >= 45 ? '#d97706' : '#e53e3e';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

const perfColor = (p) => p >= 80 ? '#2d8a4e' : p >= 60 ? '#d97706' : '#e53e3e';
const perfBg = (p) => p >= 80 ? '#f0fdf4' : p >= 60 ? '#fffbeb' : '#fff5f5';
const perfBorder = (p) => p >= 80 ? '#bbf7d0' : p >= 60 ? '#fde68a' : '#fecaca';

const FACTOR_LABELS = {
  study_hours: 'Daily Study Hours',
  focus_level: 'Focus Level (1-10)',
  breaks_taken: 'Breaks Taken',
  difficulty_level: 'Syllabus Difficulty',
  previous_score: 'Previous Quiz Score',
};

export default function AIPredictionPanel() {
  const navigate = useNavigate();
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [session, setSession] = useState(null);
  const [hasShownOnce, setHasShownOnce] = useState(false);
  const [activeTab, setActiveTab] = useState('allocation'); // 'allocation' | 'xai' | 'astar'
  const [selectedSubjectNote, setSelectedSubjectNote] = useState(null);

  const fetchAIPrediction = async (overrideHours) => {
    setLoadingAI(true);
    setAiError('');
    try {
      const { data } = await api.post('/ai-predict', { study_hours: overrideHours ?? hoursPerDay });
      setAiPrediction(data);
      setHasShownOnce(true);
    } catch (err) {
      setAiError(err?.response?.data?.error || err?.message || 'AI prediction failed.');
    }
    setLoadingAI(false);
  };

  useEffect(() => {
    api.get('/timetable').then(({ data }) => {
      if (data.timetable?.hoursPerDay) setHoursPerDay(data.timetable.hoursPerDay);
    }).catch(() => { });
    api.get('/session/today').then(({ data }) => setSession(data.session)).catch(() => { });
    fetchAIPrediction();
  }, []);

  const explanation = aiPrediction?.explanation;
  const factors = explanation?.factors || {};
  const difficultyAnalysis = aiPrediction?.difficulty_analysis || {};
  const studyPath = aiPrediction?.study_path;

  return (
    <div className="bg-[#0D0D0D] border-2 border-[#0D0D0D] rounded-[24px] p-5 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#FFFF66] border-2 border-[#FFFF66] rounded-[10px] flex items-center justify-center">
            <Sparkles size={18} className="text-[#0D0D0D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-extrabold">AI Study Reasoning Engine</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFF66] text-[#0D0D0D] uppercase tracking-wide">
                AI Foundation
              </span>
            </div>
            <p className="text-white/50 text-xs">
              Powered by Random Forest, Bayes’ Theorem, A* Search &amp; Explainable AI
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchAIPrediction()}
          disabled={loadingAI}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[8px] text-sm font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={loadingAI ? 'animate-spin-slow' : ''} />
          {loadingAI ? 'Running models…' : 'Refresh AI'}
        </button>
      </div>

      {aiError && (
        <div className="bg-red-900/40 border border-red-500/40 rounded-[10px] px-4 py-3 text-sm text-red-300 mb-4 flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{aiError}</span>
        </div>
      )}

      {loadingAI && !hasShownOnce && (
        <div className="flex items-center gap-3 py-4">
          <div className="w-5 h-5 border-2 border-[#FFFF66] border-t-transparent rounded-full animate-spin-slow flex-shrink-0" />
          <span className="text-sm text-white/60">Running multi-model AI pipeline (Random Forest, Bayes, A*)...</span>
        </div>
      )}

      {aiPrediction && (
        <div className={`flex flex-col gap-4 transform transition-all duration-500 ${loadingAI ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'}`}>
          {/* Key Metric Cards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {/* 1. Recommended Daily Hours (Unit IV) */}
            <div className="bg-[#FFFF66] border-2 border-[#FFFF66] rounded-[16px] px-5 py-4 text-[#0D0D0D]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Optimal Study Hours</span>
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/10 uppercase">Unit IV · RF</span>
              </div>
              <div className="text-[38px] font-extrabold font-display leading-none">{aiPrediction.recommended_hours}</div>
              <div className="text-[12px] font-semibold mt-1 opacity-70">
                You set: {hoursPerDay}h/day &nbsp;·&nbsp;
                {aiPrediction.recommended_hours > hoursPerDay
                  ? `+${(aiPrediction.recommended_hours - hoursPerDay).toFixed(1)}h suggested`
                  : aiPrediction.recommended_hours < hoursPerDay
                    ? 'Can take it lighter'
                    : 'On target!'}
              </div>
            </div>

            {/* 2. Predicted Performance (Unit IV) */}
            <div
              className="rounded-[16px] px-5 py-4 border-2"
              style={{
                background: perfBg(aiPrediction.predicted_performance),
                borderColor: perfBorder(aiPrediction.predicted_performance),
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} style={{ color: perfColor(aiPrediction.predicted_performance) }} />
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: perfColor(aiPrediction.predicted_performance) }}>
                    Predicted Score
                  </span>
                </div>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/10 uppercase text-black">Unit IV · RF</span>
              </div>
              <div className="text-[38px] font-extrabold font-display leading-none" style={{ color: perfColor(aiPrediction.predicted_performance) }}>
                {aiPrediction.predicted_performance}<span className="text-lg">%</span>
              </div>
              <p className="text-[12px] font-semibold mt-1 opacity-70 text-[#0D0D0D]">If you study as recommended</p>
            </div>

            {/* 3. A* Search Path Preview (Unit II) */}
            {studyPath && (
              <div
                onClick={() => setActiveTab('astar')}
                className="bg-[#87CEEB] border-2 border-[#87CEEB] rounded-[16px] px-5 py-4 text-[#0D0D0D] cursor-pointer hover:brightness-105 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Route size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Priority Subject</span>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/10 uppercase">Unit II · A*</span>
                </div>
                <div className="text-[26px] font-extrabold font-display leading-tight truncate" title={studyPath.path?.[0] || 'Optimized'}>
                  {studyPath.path?.[0] || 'Optimized'}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/10 text-[11px] font-semibold">
                  <span className="opacity-75">
                    {studyPath.path?.length > 1 ? `+${studyPath.path.length - 1} more in queue` : 'Sequence ready'}
                  </span>
                  <span className="flex items-center gap-0.5 font-bold group-hover:translate-x-0.5 transition-transform">
                    View Path <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            )}

            {/* 4. Session info */}
            {session && (
              <div className="bg-white/8 border border-white/12 rounded-[16px] px-5 py-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-3 text-white/50">Today&apos;s Session</p>
                <div className="flex flex-col gap-1.5 text-sm">
                  {[['Online', session.totalOnlineMinutes + ' min'], ['Active', session.activeMinutes + ' min'], ['Breaks', session.breaks], ['Focus', session.focusLevel + '/10']].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-white/50">{l}</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive AI Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                activeTab === 'allocation'
                  ? 'bg-white text-[#0D0D0D]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen size={13} />
              <span>Hour Allocation &amp; Naive Bayes</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/10">Unit II</span>
            </button>

            <button
              onClick={() => setActiveTab('xai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                activeTab === 'xai'
                  ? 'bg-[#FFFF66] text-[#0D0D0D]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 size={13} />
              <span>Explainable AI (XAI)</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/20">Unit V</span>
            </button>

            <button
              onClick={() => setActiveTab('astar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                activeTab === 'astar'
                  ? 'bg-[#87CEEB] text-[#0D0D0D]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Route size={13} />
              <span>A* Path Search</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/20">Unit II</span>
            </button>
          </div>

          {/* TAB 1: ALLOCATION & NAIVE BAYES */}
          {activeTab === 'allocation' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={13} className="text-white/50" />
                  <span className="text-[12px] font-bold text-white/60 uppercase tracking-wide">
                    Inverse-Accuracy Allocation + Gaussian Naive Bayes Difficulty
                  </span>
                </div>
                <span className="text-[11px] text-white/40">
                  Click a subject to practice or view Bayes probability
                </span>
              </div>

              {aiPrediction.timetable?.length > 0 ? (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {aiPrediction.timetable.map((item, i) => {
                    const nb = difficultyAnalysis[item.subject];
                    const nbColor =
                      nb?.label === 'Hard' ? 'bg-[#FFB6C1] text-[#0D0D0D]' :
                      nb?.label === 'Medium' ? 'bg-[#FFFF66] text-[#0D0D0D]' :
                      'bg-[#c8f7c5] text-[#0D0D0D]';

                    return (
                      <div
                        key={i}
                        className="bg-white/8 border border-white/10 rounded-[12px] p-3.5 transition-all hover:bg-white/15"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/subject/${encodeURIComponent(item.subject)}`)}
                            className="text-sm font-bold leading-tight hover:underline text-left text-white"
                          >
                            {item.subject}
                          </button>
                          {nb && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubjectNote(selectedSubjectNote === item.subject ? null : item.subject)}
                              title={nb.bayes_note}
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${nbColor} cursor-pointer hover:opacity-90 flex items-center gap-1`}
                            >
                              <span>Bayes: {nb.label}</span>
                              <HelpCircle size={10} />
                            </button>
                          )}
                        </div>

                        <div className="text-[24px] font-extrabold font-display leading-none mt-1">
                          {item.allocatedHours < 1 ? (
                            <>
                              {Math.round(item.allocatedHours * 60)}
                              <span className="text-xs font-semibold text-white/40 ml-1">min</span>
                            </>
                          ) : (
                            <>
                              {item.allocatedHours}
                              <span className="text-xs font-semibold text-white/40 ml-1">h</span>
                            </>
                          )}
                        </div>

                        <AccuracyBar value={item.accuracy} />

                        {nb && selectedSubjectNote === item.subject && (
                          <div className="mt-2 p-2 rounded bg-black/60 border border-white/20 text-[10px] text-white/80 leading-relaxed animate-fadeUp">
                            <span className="font-bold text-[#FFFF66] block mb-0.5">Bayes Theorem Calculation:</span>
                            {nb.bayes_note}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/10 text-[10px] text-white/40">
                          <span>Accuracy: {item.accuracy}%</span>
                          <span className="capitalize">{item.priority} Priority</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/8 border border-white/10 rounded-[12px] px-4 py-4 text-sm text-white/50">
                  📝 Take a quiz in any subject to unlock per-subject hour allocation. All subjects get equal time until then.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPLAINABLE AI (XAI) */}
          {activeTab === 'xai' && (
            <div className="bg-white/5 border border-white/10 rounded-[16px] p-5 flex flex-col gap-4 animate-fadeUp">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#FFFF66]" />
                  <h3 className="text-sm font-extrabold text-white">
                    Feature Importance Breakdown (Ensemble Random Forest Trees)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFFF66]/20 border border-[#FFFF66]/40 text-[#FFFF66]">
                  Syllabus: Unit V — Explainable AI (XAI)
                </span>
              </div>

              {explanation ? (
                <>
                  <div className="bg-[#FFFF66]/10 border border-[#FFFF66]/30 rounded-[10px] p-3 text-xs text-[#FFFF66]">
                    <strong>Primary Driver: </strong>
                    <span className="capitalize font-semibold">{FACTOR_LABELS[explanation.top_factor] || explanation.top_factor}</span>
                    <p className="mt-0.5 text-white/70">{explanation.insight}</p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">
                      Gini Importance Weight across Random Forest Estimators:
                    </span>
                    {Object.entries(factors).map(([factorKey, weight]) => {
                      const pct = Math.round(weight * 100);
                      const isTop = factorKey === explanation.top_factor;
                      return (
                        <div key={factorKey} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs">
                            <span className={`font-semibold ${isTop ? 'text-[#FFFF66]' : 'text-white/80'}`}>
                              {FACTOR_LABELS[factorKey] || factorKey} {isTop && '★ (Top Factor)'}
                            </span>
                            <span className="font-mono text-white/60">{pct}% ({weight.toFixed(3)})</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isTop ? 'bg-[#FFFF66]' : 'bg-[#87CEEB]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-white/40 italic">
                    💡 Unlike a black-box neural net, Random Forest provides exact mean impurity decrease (Gini importance)
                    across all decision trees, satisfying Unit V XAI criteria for transparency and interpretability.
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/50">XAI explanation not available for this run.</p>
              )}
            </div>
          )}

          {/* TAB 3: A* INFORMED SEARCH PATH */}
          {activeTab === 'astar' && (
            <div className="bg-white/5 border border-white/10 rounded-[16px] p-5 flex flex-col gap-4 animate-fadeUp">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Route size={16} className="text-[#87CEEB]" />
                  <h3 className="text-sm font-extrabold text-white">
                    A* Graph Search: Optimal Study Sequence Planner
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#87CEEB]/20 border border-[#87CEEB]/40 text-[#87CEEB]">
                  Syllabus: Unit II — Informed Search &amp; Heuristic Functions
                </span>
              </div>

              {studyPath ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/8 border border-white/10 rounded-[10px] p-3">
                      <span className="text-white/50 block text-[10px] uppercase font-bold">Heuristic Function h(n)</span>
                      <span className="text-white font-mono text-[11px] mt-1 block">
                        Admissible: Remaining study hours
                      </span>
                    </div>
                    <div className="bg-white/8 border border-white/10 rounded-[10px] p-3">
                      <span className="text-white/50 block text-[10px] uppercase font-bold">Evaluation Function</span>
                      <span className="text-[#87CEEB] font-mono text-[11px] mt-1 block">
                        f(n) = g(n) + h(n)
                      </span>
                    </div>
                    <div className="bg-white/8 border border-white/10 rounded-[10px] p-3">
                      <span className="text-white/50 block text-[10px] uppercase font-bold">Search Complexity</span>
                      <span className="text-[#FFFF66] font-mono text-[11px] mt-1 block">
                        {studyPath.node_expansions} State Expansions
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">
                        A* Optimal Study Route (State Space Transition)
                      </span>
                      <span className="text-[11px] text-[#87CEEB] font-mono">
                        {studyPath.total_hours}h total allocation
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-xs font-mono text-white/50 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>S₀ (Start)</span>
                      </div>

                      <ChevronRight size={14} className="text-white/30 flex-shrink-0" />

                      {studyPath.path?.map((subj, idx) => (
                        <div key={subj} className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#87CEEB] text-[#0D0D0D] font-bold text-xs shadow-sm">
                            <span className="w-5 h-5 rounded-full bg-black/15 text-[10px] flex items-center justify-center font-mono font-black">
                              {idx + 1}
                            </span>
                            <span className="text-sm">{subj}</span>
                          </div>
                          {idx < studyPath.path.length - 1 && (
                            <ChevronRight size={14} className="text-white/30 flex-shrink-0" />
                          )}
                        </div>
                      ))}

                      <ChevronRight size={14} className="text-white/30 flex-shrink-0" />

                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex-shrink-0">
                        <CheckCircle2 size={13} />
                        <span>Goal G</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/40 italic">
                    🧭 The A* algorithm proves optimality because the heuristic h(n) is admissible (never overestimates
                    the remaining hours required), guaranteeing the shortest and most effective study path.
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/50">A* path calculation not available.</p>
              )}
            </div>
          )}

          {/* Model Inputs Footer */}
          <div className="mt-1 flex items-start gap-2 bg-white/5 border border-white/10 rounded-[10px] px-3.5 py-2.5">
            <Info size={12} className="text-white/35 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              Active Model Inputs: study_hours: {aiPrediction.inputs?.study_hours}h · focus: {aiPrediction.inputs?.focus_level}/10 · breaks: {aiPrediction.inputs?.breaks} · difficulty: {aiPrediction.inputs?.difficulty_level?.toFixed(2)} · prev_score: {aiPrediction.inputs?.previous_score} · Automatically refines after every quiz and study session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

