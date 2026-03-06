import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, ChevronLeft, ChevronRight, 
  Calendar as CalendarIcon, Loader2, CheckCircle2, AlertCircle,
  Clock, MessageSquare
} from 'lucide-react';

const GAS_URL = "https://script.google.com/macros/s/AKfycbzAafyy_l_0P2oqQM5MQbvkgCUSDkAwm42Zf2Cn5NAyFhjk6y61aThKCqxwHfShDkb0/exec";

const App = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const daysJP = ['日', '月', '火', '水', '木', '金', '土'];

  // 月のレイアウトを生成する関数
  const generateMonthLayout = useCallback((y, m) => {
    const lastDay = new Date(y, m, 0).getDate();
    const arr = [];
    for (let i = 1; i <= lastDay; i++) {
      const d = new Date(y, m - 1, i);
      arr.push({
        id: i,
        date: i,
        day: daysJP[d.getDay()],
        taki: '',
        nishi: '',
        memo: ''
      });
    }
    return arr;
  }, []);

  // データ取得ロジック
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // 月を切り替えた瞬間に古いデータをクリアして新しい月の枠組みを表示する
      setSchedule(generateMonthLayout(year, month));

      try {
        const response = await fetch(`${GAS_URL}?year=${year}&month=${month}`);
        const data = await response.json();
        
        // 取得したデータが現在の選択年月に合致する場合のみセット
        if (data && data.length > 0) {
          setSchedule(data);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        // エラー時は初期レイアウトのまま（既にセット済み）
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [year, month, generateMonthLayout]);

  const changeMonth = (offset) => {
    let newMonth = month + offset;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ year, month, schedule })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setMessage({ text: 'クラウドに保存しました', type: 'success' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setMessage({ text: 'エラーが発生しました', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const statusOptions = [
    { value: '', label: '-', sub: '', color: 'bg-slate-800 text-slate-500 border-slate-700' },
    { value: 'OK_HOLIDAY', label: '○', sub: '休み', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'OK_WORK', label: '○', sub: '夜間', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { value: 'ADJUST', label: '△', sub: '要相談', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'NG', label: '×', sub: '不可', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  ];

  const handleUpdate = (id, field, value) => {
    setSchedule(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const isMatched = (taki, nishi) => {
    const ok = ['OK_HOLIDAY', 'OK_WORK'];
    return ok.includes(taki) && ok.includes(nishi);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header Container */}
      <div className="max-w-2xl mx-auto sticky top-0 z-20 px-4 pt-6 pb-2">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-800 rounded-xl p-1">
                <button 
                  onClick={() => changeMonth(-1)} 
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-90"
                >
                  <ChevronLeft size={20} className="text-slate-400" />
                </button>
                <div className="px-3 flex flex-col items-center min-w-[80px]">
                  <span className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">{year}</span>
                  <div className="relative flex items-center">
                    <span className="text-lg font-black text-white">{month}月</span>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(parseInt(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}月</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => changeMonth(1)} 
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-90"
                >
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`group relative flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 overflow-hidden ${
                isSaving 
                ? 'bg-slate-800 text-slate-500' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]'
              }`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              <span className="relative z-10">{isSaving ? '保存中' : '保存'}</span>
            </button>
          </div>

          {/* Toast Message */}
          {message.text && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm animate-in fade-in zoom-in duration-300 ${
              message.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
        </div>

        {/* Column Labels */}
        <div className="grid grid-cols-12 gap-3 mt-6 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <div className="col-span-2">Date</div>
          <div className="col-span-3 text-center">TAKI</div>
          <div className="col-span-3 text-center">NISHI</div>
          <div className="col-span-4 pl-2">Note</div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-3 mt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-4">
            <div className="relative">
                <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full animate-pulse"></div>
                <Loader2 className="animate-spin relative z-10" size={40} />
            </div>
            <p className="text-sm tracking-widest font-medium">SYNCHRONIZING...</p>
          </div>
        ) : (
          schedule.map((item) => {
            const matched = isMatched(item.taki, item.nishi);
            const isSat = item.day === '土';
            const isSun = item.day === '日';

            return (
              <div 
                key={`${year}-${month}-${item.id}`} 
                className={`grid grid-cols-12 gap-3 p-3 items-center rounded-2xl border transition-all duration-300 ${
                  matched 
                  ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Date Display */}
                <div className={`col-span-2 flex flex-col items-center justify-center leading-none ${
                  isSun ? 'text-rose-400' : isSat ? 'text-sky-400' : 'text-slate-400'
                }`}>
                  <span className="text-xl font-black">{item.date}</span>
                  <span className="text-[10px] font-bold mt-1 opacity-60 tracking-tighter">{item.day}</span>
                </div>

                {/* Taki Select */}
                <div className="col-span-3 relative group">
                  <select
                    value={item.taki}
                    onChange={(e) => handleUpdate(item.id, 'taki', e.target.value)}
                    className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer ${
                      statusOptions.find(o => o.value === item.taki)?.color
                    }`}
                  >
                    {statusOptions.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                        {o.label} {o.sub}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nishi Select */}
                <div className="col-span-3 relative">
                  <select
                    value={item.nishi}
                    onChange={(e) => handleUpdate(item.id, 'nishi', e.target.value)}
                    className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer ${
                      statusOptions.find(o => o.value === item.nishi)?.color
                    }`}
                  >
                    {statusOptions.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                        {o.label} {o.sub}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Memo Input */}
                <div className="col-span-4 relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                    <MessageSquare size={14} />
                  </div>
                  <input
                    type="text"
                    value={item.memo}
                    onChange={(e) => handleUpdate(item.id, 'memo', e.target.value)}
                    placeholder="備忘録..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs pl-9 pr-3 py-2.5 focus:bg-slate-800 focus:border-indigo-500/50 focus:ring-0 transition-all placeholder:text-slate-600 text-slate-200"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Match Count */}
      {!isLoading && schedule.some(i => isMatched(i.taki, i.nishi)) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-indigo-600 text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold tracking-tight">
              {schedule.filter(i => isMatched(i.taki, i.nishi)).length}日間 合致しています
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
