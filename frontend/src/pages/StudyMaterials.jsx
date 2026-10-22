import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashHeader from '../components/DashHeader';
import { useAuth } from '../context/AuthContext';
import { recommendMaterials } from '../utils/ai';
import {
  ExternalLink,
  BookOpen,
  BookMarked,
  Brain,
  Code2,
  Atom,
  FlaskConical,
  Calculator,
  Landmark,
  TrendingUp,
  Dna,
  Sparkles,
  ArrowRight,
  Plus,
  Video,
  Globe,
  PenTool,
  Library,
} from 'lucide-react';

const TYPE_COLORS = { book: '#FFB6C1', video: '#87CEEB', website: '#FFFF66', practice: '#c8f7c5' };
const TYPE_ICONS = {
  book: BookOpen,
  video: Video,
  website: Globe,
  practice: PenTool,
};

const NOTEBOOK_COLORS = [
  { cover: '#FFB6C1', spine: '#e0748a' },
  { cover: '#87CEEB', spine: '#4ea8c9' },
  { cover: '#FFFF66', spine: '#c8c800' },
  { cover: '#c8f7c5', spine: '#75cf82' },
  { cover: '#d7bde2', spine: '#9b59b6' },
  { cover: '#fad7a0', spine: '#d98850' },
];

function getSubjectIcon(subjectName) {
  const key = (subjectName || '').toLowerCase();
  if (key.includes('math') || key.includes('calculus') || key.includes('algebra') || key.includes('geometry') || key.includes('statistic')) {
    return Calculator;
  }
  if (key.includes('machine learning') || key.includes('ai') || key.includes('artificial intelligence') || key.includes('neural')) {
    return Brain;
  }
  if (key.includes('computer') || key.includes('python') || key.includes('code') || key.includes('data structure') || key.includes('algorithm') || key.includes('programming')) {
    return Code2;
  }
  if (key.includes('physic')) {
    return Atom;
  }
  if (key.includes('chem')) {
    return FlaskConical;
  }
  if (key.includes('bio') || key.includes('genetics')) {
    return Dna;
  }
  if (key.includes('history') || key.includes('civic') || key.includes('political') || key.includes('law')) {
    return Landmark;
  }
  if (key.includes('econ') || key.includes('account') || key.includes('business') || key.includes('finance')) {
    return TrendingUp;
  }
  return BookMarked;
}

export default function StudyMaterials() {
  const navigate = useNavigate();
  const { eduData } = useAuth();
  const subjects = eduData?.subjects || [];
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || '');
  const [weakAreas, setWeakAreas] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleRecommend = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setMaterials([]);
    try {
      const result = await recommendMaterials(selectedSubject, eduData?.educationLevel || 'general', weakAreas);
      setMaterials(result.materials || []);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to fetch materials.';
      alert(`Could not fetch study materials: ${message}`);
      setMaterials([]);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9F9F9]">
        <DashHeader title="Study Materials" />
        <div className="p-8 flex flex-col gap-7 flex-1 max-md:p-4">

          {/* Your Subjects Section */}
          <div className="animate-fadeUp">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-black text-[#0D0D0D]">Your Subjects</h3>
              <span className="text-xs font-bold text-[#666666] bg-white border border-[#0D0D0D]/20 px-3 py-1 rounded-full shadow-[1px_1px_0_#0D0D0D]">
                {subjects.length} Notebook{subjects.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-sm text-[#555555] mb-4">Click any notebook to open notes, upload PDFs, and generate AI summaries</p>
          </div>

          <div
            className="grid gap-6 animate-fadeUp mb-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
          >
            {subjects.map((subject, i) => {
              const color = NOTEBOOK_COLORS[i % NOTEBOOK_COLORS.length];
              const IconComponent = getSubjectIcon(subject);

              return (
                <div
                  key={subject}
                  onClick={() => navigate(`/subject/${encodeURIComponent(subject)}`)}
                  className="group relative h-[220px] flex cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:rotate-[-1deg] select-none"
                >
                  {/* Hanging Bookmark Ribbon */}
                  <div className="absolute -top-1.5 left-8 w-3.5 h-6 bg-[#0D0D0D] rounded-b-[2px] shadow-sm z-20 flex items-end justify-center pb-0.5 pointer-events-none group-hover:h-7 transition-all">
                    <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-[#FFFF66] rotate-45 mb-0.5" />
                  </div>

                  {/* Left Spine with realistic creasing and stitch lines */}
                  <div
                    className="w-7 flex-shrink-0 rounded-l-[10px] border-2 border-[#0D0D0D] border-r-0 relative overflow-hidden flex flex-col justify-between py-3 items-center z-10 shadow-[-2px_2px_4px_rgba(0,0,0,0.15)_inset]"
                    style={{ background: color.spine }}
                  >
                    {/* Shadow gradient across spine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/20 pointer-events-none" />
                    {/* Spine stitching marks */}
                    <div className="w-2.5 h-0.5 bg-black/35 rounded-full z-10" />
                    <div className="w-2.5 h-0.5 bg-black/35 rounded-full z-10" />
                    <div className="w-2.5 h-0.5 bg-black/35 rounded-full z-10" />
                  </div>

                  {/* Main Book Cover */}
                  <div
                    className="flex-1 border-2 border-[#0D0D0D] rounded-r-[14px] p-4 flex flex-col justify-between relative overflow-hidden shadow-[4px_4px_0_#0D0D0D] group-hover:shadow-[6px_6px_0_#0D0D0D] transition-shadow"
                    style={{ background: color.cover }}
                  >
                    {/* Debossed frame line on book cover */}
                    <div className="absolute inset-2 border border-black/10 rounded-[10px] pointer-events-none" />

                    {/* Top: Refined Icon Container */}
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="w-10 h-10 rounded-[11px] bg-white border-2 border-[#0D0D0D] flex items-center justify-center shadow-[2px_2px_0_#0D0D0D] group-hover:scale-105 transition-transform">
                        <IconComponent size={19} className="text-[#0D0D0D]" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 text-[#0D0D0D]">
                        Book
                      </span>
                    </div>

                    {/* Center: Subject Title */}
                    <div className="relative z-10 my-auto pt-2">
                      <h4 className="font-display text-[15px] font-black text-[#0D0D0D] leading-tight line-clamp-2">
                        {subject}
                      </h4>
                      <p className="text-[11px] font-semibold text-[#0D0D0D]/60 mt-1">
                        Notes &amp; Summaries
                      </p>
                    </div>

                    {/* Bottom: Refined Action Footer */}
                    <div className="relative z-10 pt-2 border-t border-black/10 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0D0D0D] group-hover:underline flex items-center gap-1">
                        Open Notes <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Subject Card */}
            <div
              onClick={() => navigate('/profile?edit=true')}
              className="h-[220px] border-2 border-dashed border-[#0D0D0D]/40 rounded-[14px] flex flex-col items-center justify-center cursor-pointer gap-2 text-[#555555] transition-all hover:border-[#0D0D0D] hover:text-[#0D0D0D] hover:bg-white hover:shadow-[4px_4px_0_#0D0D0D] bg-white/60 p-4"
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center bg-[#FFFF66] text-[#0D0D0D] shadow-[2px_2px_0_#0D0D0D]">
                <Plus size={20} className="stroke-[2.5]" />
              </div>
              <p className="text-[13px] font-extrabold text-[#0D0D0D]">Add Subject</p>
              <span className="text-[10px] text-[#777777]">Manage in profile</span>
            </div>
          </div>

          <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] p-8 animate-fadeUp">
            <h2 className="text-[22px] font-extrabold mb-1.5">Get AI-Recommended Study Materials</h2>
            <p className="text-sm text-[#555555] mb-6">Tell us your subject and weak areas — STAI will find the best resources for you.</p>

            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[13px] font-semibold">Subject</label>
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                  className="px-3.5 py-[11px] border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none bg-white focus:shadow-[0_0_0_3px_#87CEEB] transition-all">
                  {subjects.map(s => <option key={s}>{s}</option>)}
                  {subjects.length === 0 && <option>Add subjects in profile first</option>}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[13px] font-semibold">Weak areas (optional)</label>
                <input type="text" placeholder="e.g. Integration, Thermodynamics, Recursion" value={weakAreas} onChange={e => setWeakAreas(e.target.value)}
                  className="px-3.5 py-[11px] border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none bg-white focus:shadow-[0_0_0_3px_#87CEEB] transition-all" />
              </div>
              <button onClick={handleRecommend} disabled={loading || !selectedSubject}
                className="px-6 py-[11px] bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[8px] font-display text-sm font-bold whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed h-fit flex items-center gap-2">
                {loading ? 'Finding materials…' : <><Sparkles size={14} /> Find Materials</>}
              </button>
            </div>
          </div>

          {materials.length > 0 && (
            <div className="grid gap-5 animate-fadeUp" style={{gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))'}}>
              {materials.map((m, i) => {
                const TypeIcon = TYPE_ICONS[m.type] || BookOpen;
                return (
                  <div key={i} className="bg-white border-2 border-[#0D0D0D] rounded-[16px] p-5 relative overflow-hidden transition-all hover:-translate-y-[3px] hover:shadow-[5px_5px_0_#0D0D0D]">
                    <div className="absolute top-0 left-0 right-0 h-1.5" style={{background: TYPE_COLORS[m.type] || '#FFB6C1'}} />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-[8px] border-[1.5px] border-[#0D0D0D] flex items-center justify-center text-[#0D0D0D]" style={{background: TYPE_COLORS[m.type] || '#FFB6C1'}}>
                        <TypeIcon size={16} />
                      </span>
                      <span className="text-[11px] font-bold tracking-widest text-[#555555]">{m.type?.toUpperCase()}</span>
                    </div>
                    <h4 className="text-[15px] font-bold mb-2 leading-snug">{m.title}</h4>
                    <p className="text-[13px] text-[#555555] leading-relaxed mb-3.5">{m.description}</p>
                    {m.url && m.url !== '#' && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0D0D0D] underline hover:opacity-70 transition-opacity">
                        Visit Resource <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && materials.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-[16px] bg-[#FFFF66] border-2 border-[#0D0D0D] flex items-center justify-center shadow-[3px_3px_0_#0D0D0D]">
                <Library size={28} className="text-[#0D0D0D]" />
              </div>
              <p className="text-[15px] font-semibold text-[#555555]">Select a subject and click "Find Materials" to get AI-curated recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
