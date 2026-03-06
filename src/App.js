import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, ChevronLeft, ChevronRight, 
  Calendar as CalendarIcon, Loader2, CheckCircle2, AlertCircle
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

  // 月の全日程を生成する関数
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

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${GAS_URL}?year=${year}&month=${month}`);
        const data = await response.json();
        if (data && data.length > 0) {
          setSchedule(data);
        } else {
          setSchedule(generateMonthLayout(year, month));
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setSchedule(generateMonthLayout(year, month));
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
        headers: { 'Content-Type': 'text/plain' }, // CORS回避のためtext/plain
        body: JSON.stringify({ year, month, schedule })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setMessage({ text: '保存しました！', type: 'success' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setMessage({ text: '保存に失敗しました。', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const statusOptions = [
    { value: '', label: '-', color: 'bg-slate-100 text-slate-400' },
    { value: 'OK_HOLIDAY', label: '○', sub: '休み', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'OK_WORK', label: '○(夜)', sub: '仕事後', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'ADJUST', label: '△', sub: '調整可', color: 'bg-amber-100 text-amber-700' },
    { value: 'NG', label: '×', sub: '無理', color: 'bg-rose-100 text-rose-700' },
  ];

  const handleUpdate = (id, field, value) => {
    setSchedule(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const isMatched = (taki, nishi) => {
    const ok = ['OK_HOLIDAY', 'OK_WORK'];
    return ok.includes(taki) && ok.includes(nishi);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans text-slate-900">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6 sticky top-0 bg-slate-50/95 backdrop-blur py-4 z-10 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full border border-slate-200 shadow-sm transition-all active:scale-95">
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center px-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{year}</span>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="text-xl font-bold bg-transparent border-none focus:ring-0 cursor-pointer appearance-none text-center"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full border border-slate-200 shadow-sm transition-all active:scale-95">
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold shadow-lg transition-all active:scale-95 ${
              isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>

        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-2 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase px-2">
          <div className="col-span-2">日付</div>
          <div className="col-span-3 text-center">TAKI</div>
          <div className="col-span-3 text-center">NISHI</div>
          <div className="col-span-4">メモ</div>
        </div>
      </div>

      {/* Main List */}
      <div className="max-w-2xl mx-auto space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p>スケジュールを読み込み中...</p>
          </div>
        ) : (
          schedule.map((item) => {
            const matched = isMatched(item.taki, item.nishi);
            const isSat = item.day === '土';
            const isSun = item.day === '日';

            return (
              <div 
                key={item.id} 
                className={`grid grid-cols-12 gap-2 p-2 items-center rounded-xl border transition-all ${
                  matched ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`col-span-2 text-sm font-bold flex flex-col items-center leading-tight ${
                  isSun ? 'text-rose-500' : isSat ? 'text-blue-500' : 'text-slate-600'
                }`}>
                  <span className="text-lg">{item.date}</span>
                  <span className="text-[10px] opacity-70">{item.day}</span>
                </div>

                <div className="col-span-3">
                  <select
                    value={item.taki}
                    onChange={(e) => handleUpdate(item.id, 'taki', e.target.value)}
                    className={`w-full text-center py-2 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      statusOptions.find(o => o.value === item.taki)?.color
                    }`}
                  >
                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label} {o.sub}</option>)}
                  </select>
                </div>

                <div className="col-span-3">
                  <select
                    value={item.nishi}
                    onChange={(e) => handleUpdate(item.id, 'nishi', e.target.value)}
                    className={`w-full text-center py-2 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      statusOptions.find(o => o.value === item.nishi)?.color
                    }`}
                  >
                    {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label} {o.sub}</option>)}
                  </select>
                </div>

                <div className="col-span-4">
                  <input
                    type="text"
                    value={item.memo}
                    onChange={(e) => handleUpdate(item.id, 'memo', e.target.value)}
                    placeholder="..."
                    className="w-full bg-slate-50 border-none rounded-lg text-sm px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default App;
