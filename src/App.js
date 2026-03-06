import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, 
  Loader2, CheckCircle2, AlertCircle,
  MessageSquare, RefreshCw
} from 'lucide-react';

// ※ GASのURLが正しいか、末尾にスペースなどが入っていないか再度ご確認ください
const GAS_URL = "https://script.google.com/macros/s/AKfycbzAafyy_l_0P2oqQM5MQbvkgCUSDkAwm42Zf2Cn5NAyFhjk6y61aThKCqxwHfShDkb0/exec";

const App = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const daysJP = ['日', '月', '火', '水', '木', '金', '土'];
  
  const autoSaveTimerRef = useRef(null);
  const isSyncingRef = useRef(false); 
  const hasPendingChangesRef = useRef(false); 
  const lastSyncTimeRef = useRef(0);
  const lastSentTimestampRef = useRef(0);
  const retryCountRef = useRef(0);

  // カレンダーの初期レイアウト生成
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

  // 接続テスト用
  const testConnection = async () => {
    console.log("Testing connection to GAS...");
    setSyncStatus('syncing');
    try {
      const resp = await fetch(`${GAS_URL}?test=1`, { mode: 'cors' });
      const text = await resp.text();
      console.log("Response status:", resp.status);
      console.log("Response text:", text);
      setSyncStatus('synced');
      setErrorMessage('');
    } catch (e) {
      console.error("Connection Test Failed:", e);
      setSyncStatus('error');
      setErrorMessage(e.message);
    }
  };

  // データ取得ロジック
  const fetchData = useCallback(async (isSilent = false) => {
    if (isSyncingRef.current || hasPendingChangesRef.current) return;

    const now = Date.now();
    if (isSilent && now - lastSyncTimeRef.current < 5000) return;

    if (!isSilent) {
      setIsLoading(true);
      setSyncStatus('syncing');
    }
    
    const baseLayout = generateMonthLayout(year, month);

    try {
      const response = await fetch(`${GAS_URL}?year=${year}&month=${month}`, {
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // JSON解析エラーを防ぐための処理
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn("Received non-JSON response from GET:", text);
        throw new Error("Invalid data format from server");
      }
      
      if (isSyncingRef.current || hasPendingChangesRef.current) return;

      if (data && Array.isArray(data) && data.length > 0) {
        const mergedData = baseLayout.map(dayItem => {
          const savedItem = data.find(d => Number(d.date) === dayItem.date);
          return savedItem ? { ...dayItem, ...savedItem } : dayItem;
        });
        setSchedule(mergedData);
        setSyncStatus('synced');
        setErrorMessage('');
      } else if (!isSilent) {
        setSchedule(baseLayout);
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error("Fetch error details:", error);
      if (!isSilent) {
        setSyncStatus('error');
        setErrorMessage(error.message);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [year, month, generateMonthLayout]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  // サーバー保存処理
  const syncToServer = async (updatedSchedule, timestamp) => {
    if (timestamp < lastSentTimestampRef.current) return;
    
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ 
          year, 
          month, 
          schedule: updatedSchedule,
          timestamp: timestamp 
        })
      });
      
      if (!response.ok) throw new Error(`Post failed: ${response.status}`);
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        // もしGASが "Success" という文字列だけを返してきた場合も、成功とみなす
        if (text.includes("Success") || text.includes("success")) {
          result = { status: 'success' };
        } else {
          console.warn("GAS returned non-JSON text:", text);
          throw new Error("Server response was not JSON");
        }
      }
      
      if (result.status === 'success') {
        if (timestamp >= lastSentTimestampRef.current) {
          lastSyncTimeRef.current = Date.now();
          hasPendingChangesRef.current = false;
          setSyncStatus('synced');
          setErrorMessage('');
          retryCountRef.current = 0;
        }
      } else {
        throw new Error(result.message || "GAS execution error");
      }
    } catch (error) {
      console.error("Sync error details:", error);
      setSyncStatus('error');
      setErrorMessage(error.message);
      hasPendingChangesRef.current = true;

      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        setTimeout(() => {
          if (hasPendingChangesRef.current) {
            syncToServer(updatedSchedule, timestamp);
          }
        }, 3000 * retryCountRef.current);
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleUpdate = (id, field, value) => {
    hasPendingChangesRef.current = true;

    const newSchedule = schedule.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setSchedule(newSchedule);

    const timestamp = Date.now();
    lastSentTimestampRef.current = timestamp;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      syncToServer(newSchedule, timestamp);
    }, 1500);
  };

  const statusOptions = [
    { value: '', label: '-', sub: '', color: 'bg-slate-800 text-slate-500 border-slate-700' },
    { value: 'OK_HOLIDAY', label: '○', sub: '休み', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'OK_WORK', label: '○', sub: '夜間', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { value: 'ADJUST', label: '△', sub: '要相談', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'NG', label: '×', sub: '不可', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  ];

  const isMatched = (taki, nishi) => {
    const ok = ['OK_HOLIDAY', 'OK_WORK'];
    return ok.includes(taki) && ok.includes(nishi);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-2xl mx-auto sticky top-0 z-20 px-4 pt-6 pb-2">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-800 rounded-xl p-1">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-90">
                  <ChevronLeft size={20} className="text-slate-400" />
                </button>
                <div className="px-3 flex flex-col items-center min-w-[80px]">
                  <span className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">{year}</span>
                  <div className="relative flex items-center">
                    <span className="text-lg font-black text-white">{month}月</span>
                    <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full">
                      {[...Array(12)].map((_, i) => (<option key={i + 1} value={i + 1}>{i + 1}月</option>))}
                    </select>
                  </div>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:scale-90">
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            <button 
              onClick={syncStatus === 'error' ? testConnection : undefined}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="animate-spin text-indigo-400" size={14} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">同期中...</span>
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertCircle className="text-rose-400" size={14} />
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">同期エラー（解析失敗）</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-emerald-400" size={14} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">保存済み</span>
                </>
              )}
            </button>
          </div>
          {errorMessage && (
            <div className="mt-2 px-2 py-1 text-[10px] text-rose-400/70 font-mono truncate text-center">
              Error: {errorMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-3 mt-6 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <div className="col-span-2">日付</div>
          <div className="col-span-3 text-center">TAKI</div>
          <div className="col-span-3 text-center">NISHI</div>
          <div className="col-span-4 pl-2">備考</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-3 mt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-sm tracking-widest font-medium uppercase">Initializing...</p>
          </div>
        ) : (
          schedule.map((item) => {
            const matched = isMatched(item.taki, item.nishi);
            const isSat = item.day === '土';
            const isSun = item.day === '日';

            return (
              <div key={`${year}-${month}-${item.date}`} className={`grid grid-cols-12 gap-3 p-3 items-center rounded-2xl border transition-all duration-300 ${matched ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                <div className={`col-span-2 flex flex-col items-center justify-center leading-none ${isSun ? 'text-rose-400' : isSat ? 'text-sky-400' : 'text-slate-400'}`}>
                  <span className="text-xl font-black">{item.date}</span>
                  <span className="text-[10px] font-bold mt-1 opacity-60 tracking-tighter">{item.day}</span>
                </div>

                <div className="col-span-3 relative group">
                  <select value={item.taki || ''} onChange={(e) => handleUpdate(item.id, 'taki', e.target.value)} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${statusOptions.find(o => o.value === (item.taki || ''))?.color}`}>
                    {statusOptions.map(o => (<option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label} {o.sub}</option>))}
                  </select>
                </div>

                <div className="col-span-3 relative">
                  <select value={item.nishi || ''} onChange={(e) => handleUpdate(item.id, 'nishi', e.target.value)} className={`w-full text-center py-2.5 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${statusOptions.find(o => o.value === (item.nishi || ''))?.color}`}>
                    {statusOptions.map(o => (<option key={o.value} value={o.value} className="bg-slate-900 text-white">{o.label} {o.sub}</option>))}
                  </select>
                </div>

                <div className="col-span-4 relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                    <MessageSquare size={14} />
                  </div>
                  <input type="text" value={item.memo || ''} onChange={(e) => handleUpdate(item.id, 'memo', e.target.value)} placeholder="..." className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs pl-9 pr-3 py-2.5 focus:bg-slate-800 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 text-slate-200" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isLoading && schedule.some(i => isMatched(i.taki, i.nishi)) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-indigo-600 text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold tracking-tight">{schedule.filter(i => isMatched(i.taki, i.nishi)).length}日間 合致しています</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
