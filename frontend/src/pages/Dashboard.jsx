import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
  const subjects = eduData?.subjects || ['Mathematics', 'Physics', 'Chemistry'];

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
              <p className="text-[13px] text-white/50">{eduData ? `${eduData.educationLevel} · ${eduData.institution} · ${subjects.length} subjects loaded` : 'Click on a notebook to upload study materials and get started.'}</p>
            </div>
            <div className="flex gap-6 flex-shrink-0">
              {[{ val: subjects.length, label: 'Subjects' }, { val: 'AI', label: 'Ready' }].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <strong className="font-display text-2xl font-extrabold text-[#FFFF66]">{val}</strong>
                  <span className="text-[11px] text-white/50 uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Study Prediction */}
          <div className="animate-fadeUp">
            <AIPredictionPanel />
          </div>

          {/* Intelligent Agent PEAS Framework Panel (Unit III) */}
          <div className="animate-fadeUp">
            <PEASPanel />
          </div>

        </div>
      </div>
    </div>
  );
}
