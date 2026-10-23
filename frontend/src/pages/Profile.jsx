import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import DashHeader from '../components/DashHeader';
import {
  EDUCATION_LEVELS,
  COURSES_BY_LEVEL,
  TERMS_BY_LEVEL,
  SPECIALIZATIONS_BY_COURSE,
  INSTITUTION_EXAMPLES,
  findLevel,
} from '../data/educationData';

const commonSubjects = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History',
  'Geography', 'Computer Science', 'Python', 'Data Structures', 'Algorithms',
  'Machine Learning', 'Economics', 'Accountancy', 'Business Studies', 'Political Science',
];

export default function Profile() {
  const { user, eduData, saveEduData, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({
    institution: eduData?.institution || '', educationLevel: eduData?.educationLevel || '',
    course: eduData?.course || '', semester: eduData?.semester || '',
    specialization: eduData?.specialization || '', subjects: eduData?.subjects || [], customSubject: '',
  });

  const currentLevel = useMemo(() => findLevel(form.educationLevel), [form.educationLevel]);
  const availableCourses = useMemo(() => currentLevel ? (COURSES_BY_LEVEL[currentLevel.value] || []) : [], [currentLevel]);
  const termConfig = useMemo(() => currentLevel ? TERMS_BY_LEVEL[currentLevel.value] : null, [currentLevel]);
  const availableSpecializations = useMemo(() => form.course ? (SPECIALIZATIONS_BY_COURSE[form.course] || []) : [], [form.course]);

  const [customCourse, setCustomCourse] = useState(false);
  const [customSemester, setCustomSemester] = useState(false);
  const [customSpec, setCustomSpec] = useState(false);

  const handleLevelChange = (e) => {
    const val = e.target.value;
    setForm(f => ({
      ...f,
      educationLevel: val,
      course: '',
      semester: '',
      specialization: '',
    }));
    setCustomCourse(false);
    setCustomSemester(false);
    setCustomSpec(false);
  };

  const toggleSubject = (sub) => setForm(f => ({ ...f, subjects: f.subjects.includes(sub) ? f.subjects.filter(s => s !== sub) : [...f.subjects, sub] }));
  const addCustom = () => { const s = form.customSubject.trim(); if (s && !form.subjects.includes(s)) setForm(f => ({ ...f, subjects: [...f.subjects, s], customSubject: '' })); };

  const handleSave = async () => {
    setSaving(true); setSaveMsg('');
    try {
      await saveEduData(form);
      setSaveMsg('✓ Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const inputCls = "px-3.5 py-[11px] border-2 border-[#0D0D0D] rounded-[8px] text-sm outline-none focus:shadow-[0_0_0_3px_#87CEEB] transition-all w-full";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#F9F9F9]">
        <DashHeader title="My Profile" />
        <div className="p-8 flex flex-col gap-5 max-w-[760px] max-md:p-4">
          {saveMsg && <div className={`border-2 rounded-[8px] px-3.5 py-2.5 text-sm ${saveMsg.startsWith('✓') ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#2d8a4e]' : 'bg-[#fff0f0] border-red-400 text-red-700'}`}>{saveMsg}</div>}

          {/* Account info */}
          <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] px-7 py-6 flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FFB6C1] rounded-full border-2 border-[#0D0D0D] flex items-center justify-center font-display text-[22px] font-extrabold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-extrabold mb-[3px]">{user?.name}</h2>
              <p className="text-sm text-[#555555]">{user?.email}</p>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className="ml-auto px-5 py-2 bg-transparent border-2 border-red-500 rounded-[8px] text-red-500 text-sm font-semibold hover:bg-[#fff0f0] transition-colors">
              Logout
            </button>
          </div>

          <div className="bg-white border-2 border-[#0D0D0D] rounded-[24px] overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-[#0D0D0D] flex items-center justify-between bg-[#F9F9F9]">
              <h3 className="text-[17px] font-extrabold">Education Details</h3>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-[7px] bg-[#0D0D0D] text-[#FFFF66] border-none rounded-[8px] text-[13px] font-semibold cursor-pointer">
                  ✏️ Edit
                </button>
              )}
            </div>

            {!editing ? (
              <div className="px-6 py-5 flex flex-col gap-3.5">
                {[['Institution', form.institution], ['Education Level', form.educationLevel], ['Course', form.course], ['Semester / Year', form.semester], ['Specialization', form.specialization]].map(([label, val]) => val ? (
                  <div key={label} className="flex items-start gap-4 pb-3.5 border-b border-[#F0F0F0] last:border-b-0">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#555555] min-w-[130px] flex-shrink-0 pt-px">{label}</span>
                    <span className="text-sm">{val}</span>
                  </div>
                ) : null)}
                <div className="flex items-start gap-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#555555] min-w-[130px] flex-shrink-0 pt-px">Subjects</span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.subjects.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#87CEEB] border-[1.5px] border-[#0D0D0D] rounded-full text-xs font-semibold">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-4">
                {/* Institution */}
                <div className="flex flex-col gap-[7px]">
                  <label className="text-[13px] font-semibold">Institution / School</label>
                  <input
                    type="text"
                    list="profile-institution-suggestions"
                    placeholder="e.g. IIT Delhi, DPS School"
                    value={form.institution}
                    onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                    className={inputCls}
                  />
                  <datalist id="profile-institution-suggestions">
                    {INSTITUTION_EXAMPLES.map(inst => (
                      <option key={inst} value={inst} />
                    ))}
                  </datalist>
                </div>

                {/* Education Level */}
                <div className="flex flex-col gap-[7px]">
                  <label className="text-[13px] font-semibold">Education Level</label>
                  <select
                    value={form.educationLevel}
                    onChange={handleLevelChange}
                    className={inputCls + ' bg-white cursor-pointer'}
                  >
                    <option value="">Select level…</option>
                    {EDUCATION_LEVELS.map(l => (
                      <option key={l.value} value={l.label}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course and Semester / Term */}
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-[7px]">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold">Course / Stream</label>
                      {availableCourses.length > 0 && customCourse && (
                        <button
                          type="button"
                          onClick={() => { setCustomCourse(false); setForm(f => ({ ...f, course: '' })); }}
                          className="text-[11px] text-blue-600 underline font-medium cursor-pointer"
                        >
                          Select from list
                        </button>
                      )}
                    </div>
                    {availableCourses.length > 0 && !customCourse ? (
                      <select
                        value={form.course}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '__custom__') { setCustomCourse(true); setForm(f => ({ ...f, course: '', specialization: '' })); }
                          else { setCustomCourse(false); setForm(f => ({ ...f, course: val, specialization: '' })); }
                        }}
                        className={inputCls + ' bg-white cursor-pointer'}
                      >
                        <option value="">Select course…</option>
                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__custom__">✏️ Other (Custom)…</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={availableCourses.length > 0 ? "Type custom course..." : "e.g. B.Tech CSE"}
                        value={form.course}
                        onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-[7px]">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold">{termConfig ? termConfig.label : 'Semester / Year'}</label>
                      {termConfig?.options?.length > 0 && customSemester && (
                        <button
                          type="button"
                          onClick={() => { setCustomSemester(false); setForm(f => ({ ...f, semester: '' })); }}
                          className="text-[11px] text-blue-600 underline font-medium cursor-pointer"
                        >
                          Select from list
                        </button>
                      )}
                    </div>
                    {termConfig?.options?.length > 0 && !customSemester ? (
                      <select
                        value={form.semester}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '__custom__') { setCustomSemester(true); setForm(f => ({ ...f, semester: '' })); }
                          else { setCustomSemester(false); setForm(f => ({ ...f, semester: val })); }
                        }}
                        className={inputCls + ' bg-white cursor-pointer'}
                      >
                        <option value="">Select {termConfig.label.toLowerCase()}…</option>
                        {termConfig.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="__custom__">✏️ Other…</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. 3rd Sem"
                        value={form.semester}
                        onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                        className={inputCls}
                      />
                    )}
                  </div>
                </div>

                {/* Specialization */}
                <div className="flex flex-col gap-[7px]">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold">Specialization (optional)</label>
                    {availableSpecializations.length > 0 && customSpec && (
                      <button
                        type="button"
                        onClick={() => { setCustomSpec(false); setForm(f => ({ ...f, specialization: '' })); }}
                        className="text-[11px] text-blue-600 underline font-medium cursor-pointer"
                      >
                        Select from list
                      </button>
                    )}
                  </div>
                  {availableSpecializations.length > 0 && !customSpec ? (
                    <select
                      value={form.specialization}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '__custom__') { setCustomSpec(true); setForm(f => ({ ...f, specialization: '' })); }
                        else { setCustomSpec(false); setForm(f => ({ ...f, specialization: val })); }
                      }}
                      className={inputCls + ' bg-white cursor-pointer'}
                    >
                      <option value="">Select specialization…</option>
                      <option value="General / Core">General / Core</option>
                      {availableSpecializations.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="__custom__">✏️ Other (Custom)…</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. AI / ML, Finance"
                      value={form.specialization}
                      onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                      className={inputCls}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-[7px]">
                  <label className="text-[13px] font-semibold">Subjects</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {commonSubjects.map(sub => (
                      <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                        className={`px-3 py-[7px] border-2 border-[#0D0D0D] rounded-[8px] text-xs font-medium transition-all ${form.subjects.includes(sub) ? 'bg-[#FFB6C1] font-bold' : 'bg-white hover:bg-[#F0F0F0]'}`}>
                        {form.subjects.includes(sub) ? '✓ ' : ''}{sub}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Add custom subject…" value={form.customSubject}
                      onChange={e => setForm(f => ({...f,customSubject:e.target.value}))}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                      className="flex-1 px-3 py-2 border-2 border-[#E0E0E0] rounded-[8px] text-[13px] outline-none focus:border-[#0D0D0D] transition-colors" />
                    <button type="button" onClick={addCustom} className="px-4 py-2 bg-[#87CEEB] border-2 border-[#0D0D0D] rounded-[8px] text-[13px] font-semibold cursor-pointer">+ Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.subjects.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#87CEEB] border-[1.5px] border-[#0D0D0D] rounded-full text-xs font-semibold">
                        {s}
                        <button type="button" onClick={() => toggleSubject(s)} className="bg-transparent border-none text-sm cursor-pointer p-0 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(false)} className="flex-1 py-3 border-2 border-[#0D0D0D] rounded-[8px] bg-white text-sm font-semibold hover:bg-[#F0F0F0] transition-colors cursor-pointer">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 bg-[#0D0D0D] text-[#FFFF66] border-2 border-[#0D0D0D] rounded-[8px] font-display text-sm font-bold hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
