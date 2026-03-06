import React, { useState, useEffect } from 'react';
import { 
  Calendar, Save, ChevronLeft, ChevronRight,
  Heart, User, UserRound, ShieldCheck, Zap, Loader2
} from 'lucide-react';

const App = () => {
  // --- 設定 ---
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzAafyy_l_0P2oqQM5MQbvkgCUSDkAwm42Zf2Cn5NAyFhjk6y61aThKCqxwHfShDkb0/exec"; // ←ここにURLを貼り付けてください
  // -----------

  const [year] = useState('2025');
  const [currentMonth] = useState('3月');
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. スプレッドシートからデータを取得する
  useEffect(() => {
    fetch(GAS_URL)
      .then(res => res.json())
      .then(data => {
        setSchedule(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("データの読み込みに失敗しました:", err);
        setIsLoading(false);
      });
  }, []);

const handleSave = async () => {
  setIsSaving(true);

  try {
    await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schedule: schedule
      })
    });

    alert("同期が完了しました！");
  } catch (err) {
    alert("保存中にエラーが発生しました");
  } finally {
    setIsSaving(false);
  }
};

  const statusOptions = [
    { value: '', label: '-', sub: '未設定', color: 'border-slate-800 text-slate-500 bg-slate-900/50' },
    { value: 'OK_HOLIDAY', label: '○', sub: '休み', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
    { value: 'OK_WORK', label: '○', sub: '仕事後', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' },
    { value: 'ADJUST', label: '△', sub: '調整可', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
    { value: 'NG', label: '×', sub: '無理', color: 'border-rose-500/30 text-rose-400 bg-rose-500/5' },
  ];

  const handleStatusChange = (id, person, value) => {
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, [person]: value } : item
    ));
  };

  const handleMemoChange = (id, value) => {
    setSchedule(prev => prev.map(item => 
      item.id === id ? { ...item, memo: value } : item
    ));
  };

  const getStatusData = (value) => {
    return statusOptions.find(opt => opt.value === value) || statusOptions[0];
  };

  const isMatch = (taki, nishi) => {
    const okStatuses = ['OK_HOLIDAY', 'OK_WORK'];
    return okStatuses.includes(taki) && okStatuses.includes(nishi);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center text-indigo-400 font-black tracking-widest">
        <Loader2 className="animate-spin mr-3" /> INITIALIZING SYSTEM...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] p-4 md:p-12 font-sans text-slate-300 selection:bg-indigo-500/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        select { text-align-last: center; appearance: none; }
        .glass-panel {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .match-glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
        }
        .match-border {
          position: absolute;
          inset: 4px 0px;
          border: 1.5px solid transparent;
          background: linear-gradient(#02040a, #02040a) padding-box,
                      linear-gradient(90deg, #6366f1, #a855f7) border-box;
          border-radius: 12px;
          opacity: 0.6;
        }
      `}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <ShieldCheck size={20} className="text-indigo-400" />
              </div>
              <h1 className="text-3xl font-[900] tracking-tighter text-white uppercase italic">Sync v2.5</h1>
            </div>
            <p className="text-[10px] text-slate-500 tracking-[0.6em] font-bold uppercase ml-1">Live Database Connection</p>
          </div>

          <div className="flex items-center glass-panel rounded-2xl p-1.5 shadow-2xl">
            <div className="px-8 flex flex-col items-center">
              <span className="text-[9px] font-black text-indigo-400/80 tracking-[0.3em] uppercase mb-0.5">{year}</span>
              <span className="font-bold text-xl text-white tracking-tight">{currentMonth}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-12 bg-white/[0.03] border-b border-white/5 text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">
            <div className="col-span-2 py-5 text-center">日付</div>
            <div className="col-span-3 py-5 px-4 flex items-center gap-3 justify-center">
              <User size={12} className="text-blue-400/50" />
              <span>瀧</span>
            </div>
            <div className="col-span-3 py-5 px-4 flex items-center gap-3 justify-center">
              <UserRound size={12} className="text-pink-400/50" />
              <span>西</span>
            </div>
            <div className="col-span-4 py-5 text-center">メモ</div>
          </div>

          <div className="divide-y divide-white/5 relative">
            {schedule.map((item) => {
              const matched = isMatch(item.taki, item.nishi);
              return (
                <div key={item.id} className={`grid grid-cols-12 relative items-center transition-all duration-300 min-h-[90px] ${matched ? 'match-glow' : 'hover:bg-white/[0.02]'}`}>
                  {matched && (
                    <div className="absolute inset-0 z-0 pointer-events-none">
                      <div className="match-border" />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-0.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20">
                        <Zap size={8} className="text-white fill-white" />
                        <span className="text-[8px] font-black text-white tracking-widest leading-none">MATCH</span>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 py-4 flex flex-col items-center justify-center border-r border-white/5">
                    <span className={`text-lg font-black tracking-tighter ${item.day === '土' ? 'text-blue-400' : item.day === '日' ? 'text-rose-400' : 'text-white'}`}>
                      {item.date}
                    </span>
                    <span className="text-[9px] font-bold opacity-30 tracking-widest mt-1 uppercase">{item.day}</span>
                  </div>

                  <div className="col-span-3 p-3 z-10">
                    <div className={`group relative w-full h-14 rounded-xl border transition-all duration-500 flex items-center justify-center ${getStatusData(item.taki).color}`}>
                      <select 
                        value={item.taki}
                        onChange={(e) => handleStatusChange(item.id, 'taki', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">{opt.label} - {opt.sub}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none flex flex-col items-center">
                        <span className="text-base font-black leading-none">{getStatusData(item.taki).label}</span>
                        <span className="text-[8px] font-bold mt-1 opacity-60 uppercase">{getStatusData(item.taki).sub}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 p-3 z-10">
                    <div className={`group relative w-full h-14 rounded-xl border transition-all duration-500 flex items-center justify-center ${getStatusData(item.nishi).color}`}>
                      <select 
                        value={item.nishi}
                        onChange={(e) => handleStatusChange(item.id, 'nishi', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">{opt.label} - {opt.sub}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none flex flex-col items-center">
                        <span className="text-base font-black leading-none">{getStatusData(item.nishi).label}</span>
                        <span className="text-[8px] font-bold mt-1 opacity-60 uppercase">{getStatusData(item.nishi).sub}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 px-6 h-full flex items-center group-hover:bg-white/[0.01]">
                    <input 
                      type="text"
                      placeholder="..."
                      value={item.memo}
                      onChange={(e) => handleMemoChange(item.id, e.target.value)}
                      className={`w-full bg-transparent border-none focus:ring-0 text-[11px] font-medium tracking-wide placeholder:text-slate-800 transition-all ${matched ? 'text-indigo-200' : 'text-slate-500 hover:text-slate-300'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {statusOptions.filter(o => o.value !== '').map(o => (
              <div key={o.value} className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
                <div className={`w-2 h-2 rounded-full border ${o.color}`} />
                <span className="text-[9px] font-black uppercase tracking-widest">{o.sub}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="group relative px-10 py-4 overflow-hidden rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-transform group-hover:scale-110" />
            <span className="relative z-10 flex items-center gap-3 text-white text-[11px] font-black tracking-[0.4em] uppercase">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? "Syncing..." : "Save to Cloud"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
