import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Edit, ChevronDown, Search, Send, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { askStudyQuestion } from '../utils/ai';

export default function DashHeader({ title }) {
  const { user, logout, eduData } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalQ, setGlobalQ] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const askQuestion = async () => {
    const query = globalQ.trim();
    if (!query) return;
    setAiLoading(true); setAiAnswer('');
    
    try { 
      const ans = await askStudyQuestion(query, '', eduData); 
      setAiAnswer(ans); 
      
      // Save to search history
      try {
        const stored = JSON.parse(localStorage.getItem('stai_search_history') || '[]');
        // Remove duplicates and prepend
        const updated = [{ question: query, answer: ans }, ...stored.filter(i => i.question !== query)].slice(0, 10);
        localStorage.setItem('stai_search_history', JSON.stringify(updated));
        window.dispatchEvent(new Event('history-updated'));
      } catch (e) { console.error('Failed to save search history', e); }
      
    }
    catch { setAiAnswer('⚠️ Could not get an answer.'); }
    
    setAiLoading(false);
  };

  return (
    <header className="h-[72px] px-8 flex items-center justify-between border-b-2 border-[#E0E0E0] bg-white sticky top-0 z-50">
      <h2 className={`font-display text-xl font-bold text-[#0D0D0D] transition-opacity duration-300 ${searchOpen ? 'opacity-0 w-0 overflow-hidden sm:opacity-100 sm:w-auto' : 'opacity-100'}`}>{title}</h2>

      <div className="flex items-center gap-4 ml-auto relative" ref={searchContainerRef}>
        {/* Expandable Search Bar */}
        <div className={`flex items-center gap-2 bg-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden
          ${searchOpen ? 'w-[calc(100vw-180px)] sm:w-[400px] border-2 border-[#0D0D0D] rounded-[16px] px-3 py-2 shadow-sm' : 'w-10 h-10 border-0 rounded-full px-0 py-0 justify-center cursor-pointer hover:bg-gray-100'}`}
          onClick={() => !searchOpen && setSearchOpen(true)}
        >
          <div className="relative w-[18px] h-[18px] flex-shrink-0 cursor-pointer" onClick={(e) => {
            if (searchOpen) { e.stopPropagation(); setSearchOpen(false); setAiAnswer(''); setGlobalQ(''); }
          }}>
            <Search size={18} className={`absolute top-0 left-0 text-[#0D0D0D] transition-all duration-300 ${searchOpen ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
            <X size={18} className={`absolute top-0 left-0 text-[#0D0D0D] transition-all duration-300 ${searchOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`} />
          </div>
          
          {searchOpen && (
            <div className="flex items-center flex-1 gap-2 min-w-0 animate-fadeUp" style={{ animationDuration: '0.3s' }}>
              <input type="text" placeholder="Ask any study question..." autoFocus
                value={globalQ} onChange={e => setGlobalQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && askQuestion()}
                className="flex-1 w-full min-w-0 border-none outline-none text-[14px] bg-transparent text-[#0D0D0D] truncate" />
              <button onClick={askQuestion} disabled={aiLoading}
                className="bg-[#0D0D0D] text-[#FFFF66] border-none rounded-[8px] w-8 h-8 flex items-center justify-center flex-shrink-0 hover:bg-[#1A1A1A] transition-colors disabled:opacity-60">
                {aiLoading ? <span className="w-3.5 h-3.5 border-2 border-[#FFFF66] border-t-transparent rounded-full animate-spin-slow inline-block" /> : <Send size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div
          className="relative flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-[12px] border-2 border-[#E0E0E0] hover:border-[#0D0D0D] transition-colors select-none flex-shrink-0 bg-white"
          onClick={() => setOpen(!open)}
        >
          <div className="w-8 h-8 bg-[#FFB6C1] rounded-[8px] flex items-center justify-center font-display font-bold text-sm text-[#0D0D0D] flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-semibold text-[#0D0D0D]">{user?.name || 'User'}</span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />

          {open && (
          <div className="absolute top-[calc(100%+16px)] right-0 w-56 bg-white border-2 border-[#0D0D0D] rounded-[16px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.12)] animate-fadeUp">
            <div className="px-4 py-3.5 bg-[#F9F9F9] border-b border-[#E0E0E0]">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-[#555555] mt-0.5">{user?.email}</p>
            </div>
            <button
              className="flex items-center gap-2 w-full px-4 py-[11px] bg-transparent border-none text-sm text-[#0D0D0D] text-left hover:bg-[#F9F9F9] transition-colors"
              onClick={() => { navigate('/profile'); setOpen(false); }}
            >
              <User size={14} /> My Profile
            </button>
            <button
              className="flex items-center gap-2 w-full px-4 py-[11px] bg-transparent border-none text-sm text-[#0D0D0D] text-left hover:bg-[#F9F9F9] transition-colors"
              onClick={() => { navigate('/profile?edit=true'); setOpen(false); }}
            >
              <Edit size={14} /> Edit Edu Data
            </button>
            <div className="h-px bg-[#E0E0E0] my-1" />
            <button
              className="flex items-center gap-2 w-full px-4 py-[11px] bg-transparent border-none text-sm text-red-500 text-left hover:bg-[#F9F9F9] transition-colors"
              onClick={handleLogout}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
        </div>
        {searchOpen && aiAnswer && (
          <div className="absolute top-[calc(100%+16px)] right-[64px] w-[calc(100vw-96px)] sm:w-[450px] bg-white border-2 border-[#FFFF66] shadow-[8px_8px_0_1px_rgba(255,255,102,1)] rounded-[16px] px-5 py-4 max-h-[60vh] overflow-y-auto animate-fadeUp z-50 transition-all cursor-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#555555] mb-2.5"><Sparkles size={14} /> AI Answer</div>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
          </div>
        )}
      </div>
    </header>
  );
}
