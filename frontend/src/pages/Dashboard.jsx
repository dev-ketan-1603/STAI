import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import DashHeader from '../components/DashHeader';
import AIPredictionPanel from '../components/AIPredictionPanel';
import PEASPanel from '../components/PEASPanel';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../hooks/useSession';

export default function Dashboard() {
  const { user, eduData } = useAuth();
  const navigate = useNavigate();
  useSession(); // track online time & breaks
  const subjects = eduData?.subjects?.length ? eduData.subjects : [];
  const hasSubjects = subjects.length > 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9F9F9]">
        <DashHeader title="Dashboard" />
        <div className="p-6 flex-1 flex flex-col gap-4 max-sm:p-4">

          {/* Welcome banner */}
          <div className="bg-[#0D0D0D] rounded-[24px] px-6 py-5 flex items-center justify-between gap-4 animate-fadeUp max-sm:flex-col max-sm:items-start">
            <div>
              <h2 className="text-[20px] font-extrabold text-white mb-1">Welcome back, {user?.name?.split(' ')[0] || 'Scholar'}! 👋</h2>
              <p className="text-[13px] text-white/50">
                {hasSubjects
                  ? `${eduData.educationLevel} · ${eduData.institution} · ${subjects.length} subject${subjects.length !== 1 ? 's' : ''} loaded`
                  : 'Set up your subjects to unlock AI-powered study predictions.'}
              </p>
            </div>
            <div className="flex gap-6 flex-shrink-0">
              {[{ val: hasSubjects ? subjects.length : '—', label: 'Subjects' }, { val: 'AI', label: 'Ready' }].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <strong className="font-display text-2xl font-extrabold text-[#FFFF66]">{val}</strong>
                  <span className="text-[11px] text-white/50 uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Empty state — no subjects selected yet */}
          {!hasSubjects && (
            <div className="animate-fadeUp flex flex-col items-center justify-center gap-5 py-16 px-6 bg-white border-2 border-dashed border-[#0D0D0D]/20 rounded-[24px] text-center">
              <div className="w-16 h-16 rounded-[20px] bg-[#FFFF66] border-2 border-[#0D0D0D] flex items-center justify-center shadow-[3px_3px_0_#0D0D0D]">
                <BookOpen size={28} className="text-[#0D0D0D]" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0D0D0D] mb-1">No subjects set up yet</h3>
                <p className="text-sm text-[#555555] max-w-xs mx-auto">
                  Tell us about your education and subjects — the AI will then personalise study plans, predict scores, and build your optimal schedule.
                </p>
              </div>
              <button
                onClick={() => navigate('/data-collection')}
                className="flex items-center gap-2 px-6 py-3 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[10px] font-bold text-sm hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.2)] transition-all"
              >
                <Sparkles size={15} />
                Set Up My Subjects
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* AI panels — only shown when subjects are set */}
          {hasSubjects && (
            <>
              {/* AI Study Prediction */}
              <div className="animate-fadeUp">
                <AIPredictionPanel />
              </div>

              {/* Intelligent Agent PEAS Framework Panel (Unit III) */}
              <div className="animate-fadeUp">
                <PEASPanel />
              </div>
            </>
          )}

          {/* PEAS panel is always visible — it's about the app architecture, not user data */}
          {!hasSubjects && (
            <div className="animate-fadeUp">
              <PEASPanel />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
