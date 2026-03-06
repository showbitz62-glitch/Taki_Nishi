import React, { useState, useEffect } from "react";
import {
  Save,
  ChevronLeft,
  ChevronRight,
  User,
  UserRound,
  ShieldCheck,
  Zap,
  Loader2
} from "lucide-react";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzAafyy_l_0P2oqQM5MQbvkgCUSDkAwm42Zf2Cn5NAyFhjk6y61aThKCqxwHfShDkb0/exec";

const statusOptions = [
  { value: "", label: "-", sub: "未設定" },
  { value: "OK_HOLIDAY", label: "○", sub: "休み" },
  { value: "OK_WORK", label: "○", sub: "仕事後" },
  { value: "ADJUST", label: "△", sub: "調整可" },
  { value: "NG", label: "×", sub: "無理" }
];

export default function App() {
  const [year] = useState(2025);
  const [month, setMonth] = useState(3);
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getDaysInMonth = (y, m) => {
    const days = new Date(y, m, 0).getDate();
    const arr = [];

    for (let i = 1; i <= days; i++) {
      const d = new Date(y, m - 1, i);
      const day = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];

      arr.push({
        id: `${y}-${m}-${i}`,
        date: i,
        day,
        taki: "",
        nishi: "",
        memo: ""
      });
    }

    return arr;
  };

  const loadData = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`${GAS_URL}?year=${year}&month=${month}`);
      const data = await res.json();

      if (data.length === 0) {
        setSchedule(getDaysInMonth(year, month));
      } else {
        setSchedule(data);
      }
    } catch {
      setSchedule(getDaysInMonth(year, month));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const changeMonth = (dir) => {
    let newMonth = month + dir;

    if (newMonth < 1) newMonth = 12;
    if (newMonth > 12) newMonth = 1;

    setMonth(newMonth);
  };

  const handleStatusChange = (id, person, value) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [person]: value } : item
      )
    );
  };

  const handleMemoChange = (id, value) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, memo: value } : item
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        year,
        month,
        schedule
      })
    });

    alert("保存しました");
    setIsSaving(false);
  };

  const isMatch = (taki, nishi) => {
    const ok = ["OK_HOLIDAY", "OK_WORK"];
    return ok.includes(taki) && ok.includes(nishi);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <Loader2 className="animate-spin mr-2" /> loading...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">

      <div className="flex justify-between items-center mb-6">

        <div className="flex items-center gap-3">
          <ShieldCheck />
          <h1 className="text-2xl font-bold">Sync</h1>
        </div>

        <div className="flex items-center gap-4">

          <button onClick={() => changeMonth(-1)}>
            <ChevronLeft />
          </button>

          <div className="text-xl font-bold">
            {year}年 {month}月
          </div>

          <button onClick={() => changeMonth(1)}>
            <ChevronRight />
          </button>

        </div>
      </div>

      <div className="grid grid-cols-12 border-b pb-2 mb-2">
        <div className="col-span-2">日付</div>
        <div className="col-span-3 flex items-center gap-1">
          <User size={14}/>瀧
        </div>
        <div className="col-span-3 flex items-center gap-1">
          <UserRound size={14}/>西
        </div>
        <div className="col-span-4">メモ</div>
      </div>

      {schedule.map((item) => {
        const matched = isMatch(item.taki, item.nishi);

        return (
          <div
            key={item.id}
            className={`grid grid-cols-12 py-2 border-b ${
              matched ? "bg-indigo-900/40" : ""
            }`}
          >
            <div className="col-span-2">
              {item.date} ({item.day})
            </div>

            <div className="col-span-3">
              <select
                value={item.taki}
                onChange={(e) =>
                  handleStatusChange(item.id, "taki", e.target.value)
                }
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} {o.sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <select
                value={item.nishi}
                onChange={(e) =>
                  handleStatusChange(item.id, "nishi", e.target.value)
                }
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} {o.sub}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-4">
              <input
                value={item.memo}
                onChange={(e) =>
                  handleMemoChange(item.id, e.target.value)
                }
              />
            </div>
          </div>
        );
      })}

      <div className="mt-6">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded"
        >
          {isSaving ? <Loader2 className="animate-spin"/> : <Save />}
          保存
        </button>
      </div>
    </div>
  );
}
