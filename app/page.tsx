"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Student = {
  id: number;
  name: string;
  notes?: string;
  // 累計總堂數
  sessionsThisWeek: number;
};

type LessonExercise = {
  id: number;
  name: string;
  weight: number;
  reps: number;
  sets: number;
};

type Lesson = {
  id: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  note?: string; // 課程備註
  exercises: LessonExercise[];
};

type WeightEntry = {
  id: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  weight: number;
};

type LastDeleted =
  | { kind: "lesson"; entry: Lesson }
  | { kind: "weight"; entry: WeightEntry }
  | null;

const STORAGE_KEYS = {
  students: "lazycoach_students",
  sessions: "lazycoach_sessions", // 這裡沿用 key，但內容改成 Lesson[]
  weights: "lazycoach_weights",
};

const defaultStudents: Student[] = [
  { id: 1, name: "Alice", notes: "比基尼選手", sessionsThisWeek: 2 },
  { id: 2, name: "Bob", notes: "減脂期", sessionsThisWeek: 1 },
  { id: 3, name: "Cathy", notes: "備賽中", sessionsThisWeek: 3 },
];

const todayKey = new Date().toISOString().slice(0, 10);
const todayDisplay = new Date().toLocaleDateString("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function HomePage() {
  // ---------- state ----------
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );

  // 新增學生
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");

  // 課程資訊
  const [sessionDate, setSessionDate] = useState<string>(todayKey); // 一堂課的日期
  const [sessionNote, setSessionNote] = useState(""); // 課程備註

  // 「這堂課」裡要加入的單一動作輸入欄位
  const [exerciseName, setExerciseName] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");

  // 目前正在編輯的這堂課：動作暫存
  const [draftExercises, setDraftExercises] = useState<LessonExercise[]>([]);

  // 體重：日期 & 表單
  const [weightDate, setWeightDate] = useState<string>(todayKey);
  const [weightRecord, setWeightRecord] = useState("");
  
  // 歷史課程：哪些課程目前是展開狀態
  const [expandedLessonIds, setExpandedLessonIds] = useState<number[]>([]);

  const toggleLessonExpanded = (id: number) => {
    setExpandedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [activeTab, setActiveTab] = useState<"session" | "weight">("session");

  // Undo 用
  const [lastDeleted, setLastDeleted] = useState<LastDeleted>(null);

  // ---------- 初始化：從 localStorage 讀資料 ----------
  useEffect(() => {
    try {
      const storedStudents = window.localStorage.getItem(STORAGE_KEYS.students);
      const storedSessions = window.localStorage.getItem(STORAGE_KEYS.sessions);
      const storedWeights = window.localStorage.getItem(STORAGE_KEYS.weights);

      if (storedStudents) {
        const parsed = JSON.parse(storedStudents) as Student[];
        setStudents(parsed);
        if (parsed.length > 0) setSelectedStudentId(parsed[0].id);
      } else {
        setStudents(defaultStudents);
        setSelectedStudentId(defaultStudents[0]?.id ?? null);
      }

      // 讀取課程：可能是舊版 (單一動作) 或新版 (Lesson[])
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if ("exercises" in parsed[0]) {
            // 新版 Lesson 結構
            setLessons(parsed as Lesson[]);
          } else {
            // 舊版資料，每一筆視為一堂只有一個動作的課
            const migrated: Lesson[] = parsed.map((ses: any) => {
              const id = ses.id ?? Date.now() + Math.random();
              return {
                id,
                studentId: ses.studentId,
                date: ses.date,
                note: ses.note,
                exercises: [
                  {
                    id: id + 1,
                    name: ses.exerciseName ?? ses.exerciseName ?? "",
                    weight: Number(ses.weight ?? 0),
                    reps: Number(ses.reps ?? 0),
                    sets: Number(ses.sets ?? 0),
                  },
                ],
              };
            });
            setLessons(migrated);
          }
        }
      }

      if (storedWeights) {
        setWeights(JSON.parse(storedWeights));
      }
    } catch (e) {
      console.error("讀取 localStorage 發生問題：", e);
      setStudents(defaultStudents);
      setSelectedStudentId(defaultStudents[0]?.id ?? null);
    }
  }, []);

  // ---------- 存回 localStorage ----------
  useEffect(() => {
    if (students.length) {
      window.localStorage.setItem(
        STORAGE_KEYS.students,
        JSON.stringify(students)
      );
    }
  }, [students]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify(lessons)
    );
  }, [lessons]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.weights, JSON.stringify(weights));
  }, [weights]);

  // ---------- 衍生資料 ----------
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  // 指定日期、指定學生的所有課程
  const lessonsForSelectedAndDate = useMemo(
    () =>
      lessons.filter(
        (l) => l.studentId === selectedStudentId && l.date === sessionDate
      ),
    [lessons, selectedStudentId, sessionDate]
  );

  // 該學生所有歷史課程（按日期排序）
  const allLessonsForSelected = useMemo(
    () =>
      lessons
        .filter((l) => l.studentId === selectedStudentId)
        .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.id - a.id // 日期新→舊，同一天用 id 新→舊
      ),
    [lessons, selectedStudentId]
  );

  const weightRecordsForSelected = useMemo(
    () =>
      weights
        .filter((w) => w.studentId === selectedStudentId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [weights, selectedStudentId]
  );

  const maxWeightForChart = useMemo(() => {
    if (!weightRecordsForSelected.length) return 0;
    return Math.max(...weightRecordsForSelected.map((w) => w.weight));
  }, [weightRecordsForSelected]);

  const minWeightForChart = useMemo(() => {
    if (!weightRecordsForSelected.length) return 0;
    return Math.min(...weightRecordsForSelected.map((w) => w.weight));
  }, [weightRecordsForSelected]);

  const chartWidth = 260;
  const chartHeight = 80;

  const linePoints = useMemo(() => {
    if (!weightRecordsForSelected.length) return "";
    const range =
      maxWeightForChart - minWeightForChart === 0
        ? 1
        : maxWeightForChart - minWeightForChart;

    return weightRecordsForSelected
      .map((w, index) => {
        const x =
          (chartWidth * index) /
          Math.max(weightRecordsForSelected.length - 1, 1);
        const normalized = (w.weight - minWeightForChart) / range;
        const y =
          chartHeight - 10 - normalized * (chartHeight - 20);
        return `${x},${y}`;
      })
      .join(" ");
  }, [weightRecordsForSelected, maxWeightForChart, minWeightForChart]);

  // ---------- 動作：新增學生 ----------
  const handleAddStudent = () => {
    const name = newStudentName.trim();
    if (!name) return;

    const newStudent: Student = {
      id: Date.now(),
      name,
      notes: newStudentNotes.trim() || undefined,
      sessionsThisWeek: 0,
    };
    setStudents((prev) => [...prev, newStudent]);
    setNewStudentName("");
    setNewStudentNotes("");
    setSelectedStudentId(newStudent.id);
  };

  // ---------- 動作：把動作加入「這堂課」的暫存 ----------
  const handleAddExerciseToDraft = () => {
    const exName = exerciseName.trim();
    if (!exName) return;

    const w = Number(weightKg);
    const r = Number(reps);
    const s = Number(sets);
    if (!w || !r || !s) return;

    const exercise: LessonExercise = {
      id: Date.now() + Math.random(),
      name: exName,
      weight: w,
      reps: r,
      sets: s,
    };

    setDraftExercises((prev) => [...prev, exercise]);

    setExerciseName("");
    setWeightKg("");
    setReps("");
    setSets("");
  };

  // ---------- 動作：儲存整堂課 ----------
  const handleSaveLesson = () => {
    if (!selectedStudentId) return;
    if (!sessionDate) return;
    if (draftExercises.length === 0) return;

    const note = sessionNote.trim() || undefined;

    const newLesson: Lesson = {
      id: Date.now(),
      studentId: selectedStudentId,
      date: sessionDate,
      note,
      exercises: draftExercises,
    };

    setLessons((prev) => [...prev, newLesson]);

    // 累計堂數 +1
    setStudents((prev) =>
      prev.map((st) =>
        st.id === selectedStudentId
          ? { ...st, sessionsThisWeek: st.sessionsThisWeek + 1 }
          : st
      )
    );

    // 清空暫存
    setDraftExercises([]);
    setSessionNote("");
    setLastDeleted(null);
  };

  // ---------- 動作：刪除整堂課 ----------
  const handleDeleteLesson = (id: number) => {
    const target = lessons.find((l) => l.id === id);
    if (!target) return;

    setLastDeleted({ kind: "lesson", entry: target });
    setLessons((prev) => prev.filter((l) => l.id !== id));
    setStudents((prev) =>
      prev.map((st) =>
        st.id === target.studentId
          ? { ...st, sessionsThisWeek: Math.max(0, st.sessionsThisWeek - 1) }
          : st
      )
    );
  };

  // ---------- 動作：新增體重紀錄 ----------
  const handleAddWeight = () => {
    if (!selectedStudentId) return;
    if (!weightDate) return;

    const w = Number(weightRecord);
    if (!w) return;

    const newWeight: WeightEntry = {
      id: Date.now(),
      studentId: selectedStudentId,
      date: weightDate,
      weight: w,
    };

    setWeights((prev) => [...prev, newWeight]);
    setWeightRecord("");
    setLastDeleted(null);
  };

  // ---------- 動作：刪除體重紀錄 ----------
  const handleDeleteWeight = (id: number) => {
    const target = weights.find((w) => w.id === id);
    if (!target) return;

    setLastDeleted({ kind: "weight", entry: target });
    setWeights((prev) => prev.filter((w) => w.id !== id));
  };

  // ---------- Undo ----------
  const handleUndo = () => {
    if (!lastDeleted) return;

    if (lastDeleted.kind === "lesson") {
      const entry = lastDeleted.entry;
      setLessons((prev) => [...prev, entry]);
      setStudents((prev) =>
        prev.map((st) =>
          st.id === entry.studentId
            ? { ...st, sessionsThisWeek: st.sessionsThisWeek + 1 }
            : st
        )
      );
    } else if (lastDeleted.kind === "weight") {
      const entry = lastDeleted.entry;
      setWeights((prev) => [...prev, entry]);
    }

    setLastDeleted(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex justify-center px-4 py-8">
      <div className="w-full max-w-5xl space-y-6">
        {/* Top Bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 你的 icon 圖：請把檔案放在 public，例如 /lazycoach-logo.png */}
            <div className="relative h-25 w-25 md:h-12 md:w-12">
              <Image
                src="/lazycoach-logo.png" // 檔名依你實際的改
                alt="LazyCoach logo"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                LazyCoach
              </h1>
              <p className="text-xs text-slate-500">
                Efficient and Effective
              </p>
            </div>
          </div>

          <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] text-slate-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Local data · Auto save
          </span>
        </header>

        {/* Today display */}
        <section className="text-sm text-slate-500">
          Today ：
          <span className="font-mono text-slate-800">{todayDisplay}</span>
        </section>

        {/* Layout */}
        <section className="grid grid-cols-1 md:grid-cols-[2fr,3fr] gap-4">
          {/* ===== 左：學生選單＋新增學生 ===== */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-[0.16em]">
                  STUDENTS
                </h2>
                <span className="text-[10px] text-slate-400">
                  
                </span>
              </div>

              {/* 選單式學生名單 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 block">
                  選擇學生
                </label>
                <select
                  value={
                    selectedStudentId !== null
                      ? String(selectedStudentId)
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedStudentId(v ? Number(v) : null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                >
                  <option value="">請選擇學生</option>
                  {students.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}（累計 {s.sessionsThisWeek} 堂）
                    </option>
                  ))}
                </select>

                {/* 顯示目前學生資訊 */}
                {selectedStudent && (
                  <div className="mt-2 text-xs text-slate-700 space-y-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-500">目前選擇：</span>
                        <span className="font-medium">
                          {selectedStudent.name}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-500 text-[11px] px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {selectedStudent.sessionsThisWeek} 堂
                      </span>
                    </div>
                    {selectedStudent.notes && (
                      <div className="text-slate-500">
                        備註：{selectedStudent.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 新增學生區 */}
            <div className="border-top border-slate-200 pt-3 space-y-2">
              <p className="text-xs text-slate-500 mb-1">新增學生</p>
              <input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 mb-1 transition"
                placeholder="學生姓名"
              />
              <input
                value={newStudentNotes}
                onChange={(e) => setNewStudentNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 mb-2 transition"
                placeholder="備註（選手類型、目標…）"
              />
              <button
                onClick={handleAddStudent}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold py-2 text-white transition-colors"
              >
                ＋ 新增學生並選取
              </button>
            </div>
          </div>

          {/* ===== 右：Tab 區 ===== */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-sm">
            {/* Tabs */}
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-full bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setActiveTab("session")}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    activeTab === "session"
                      ? "bg-red-500 text-white font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  課程紀錄
                </button>
                <button
                  onClick={() => setActiveTab("weight")}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    activeTab === "weight"
                      ? "bg-red-500 text-white font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  體重紀錄
                </button>
              </div>
              <span className="text-xs text-slate-500">
                {selectedStudent
                  ? `目前選擇：${selectedStudent.name}`
                  : "請先選擇學生"}
              </span>
            </div>

            {/* ===== 課程 Tab ===== */}
            {activeTab === "session" ? (
              <>
                {/* Step 1：課程資訊 */}
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500">
                   課程資訊
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">日期</span>
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        課程備註
                      </span>
                      <input
                        value={sessionNote}
                        onChange={(e) => setSessionNote(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="例如：腿部訓練"
                      />
                    </label>
                  </div>
                </div>

                {/* Step 2：新增動作到這堂課 */}
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3 mt-3">
                  <p className="text-xs font-semibold text-slate-500">
                    新增動作到本堂課
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        動作項目
                      </span>
                      <input
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="例如：深蹲 / 臥推 / 硬舉"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        重量 (kg)
                      </span>
                      <input
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="40"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        次數 (reps)
                      </span>
                      <input
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="12"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        組數 (sets)
                      </span>
                      <input
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="3"
                        inputMode="numeric"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleAddExerciseToDraft}
                    disabled={!selectedStudentId}
                    className="mt-1 w-full rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-semibold py-2 transition-colors"
                  >
                    ＋ 加入動作到本堂課
                  </button>

                  {/* 顯示目前這堂課已加入的動作 */}
                  <div className="mt-2">
                    <h3 className="text-xs font-semibold text-slate-600 mb-1">
                      本堂課已加入的動作
                    </h3>
                    {draftExercises.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        還沒有動作，先新增一個。
                      </p>
                    ) : (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {draftExercises.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex justify-between items-center rounded-xl bg-white border border-slate-200 px-3 py-1.5"
                          >
                            <span>{ex.name}</span>
                            <span className="text-slate-500">
                              {ex.weight}kg × {ex.reps} × {ex.sets}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={handleSaveLesson}
                    disabled={!selectedStudentId || draftExercises.length === 0}
                    className="mt-3 w-full rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold py-2 transition-colors"
                  >
                    ✅ 儲存本堂課（+1 堂）
                  </button>
                </div>

                {/* 當日課程列表 */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-600">
                    當日課程（{sessionDate || "未選日期"}）
                  </h3>
                  {lessonsForSelectedAndDate.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      目前這一天沒有課程。
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {lessonsForSelectedAndDate.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[11px] uppercase text-slate-400">
                                Lesson
                              </span>
                              <span className="text-slate-700">
                                {lesson.note || "（無備註）"}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="text-[11px] px-2 py-1 rounded-full border border-slate-300 hover:bg-red-50 hover:border-red-400 text-slate-500 hover:text-red-500 transition-colors"
                            >
                              刪除整堂課
                            </button>
                          </div>
                          <ul className="mt-1 space-y-1">
                            {lesson.exercises.map((ex) => (
                              <li
                                key={ex.id}
                                className="flex justify-between text-[11px] text-slate-600"
                              >
                                <span>{ex.name}</span>
                                <span>
                                  {ex.weight}kg × {ex.reps} × {ex.sets}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                                {/* 歷史課程（所有日期，可展開/收合） */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-600">
                    歷史課程（此學生所有紀錄）
                  </h3>
                  {(!selectedStudentId || allLessonsForSelected.length === 0) ? (
                    <p className="text-xs text-slate-400">
                      尚無任何課程紀錄。
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-700 max-h-52 overflow-y-auto pr-1">
                      {allLessonsForSelected.map((lesson) => {
                        const expanded = expandedLessonIds.includes(lesson.id);
                        return (
                          <li
                            key={lesson.id}
                            className="rounded-2xl bg-white border border-slate-200 px-3 py-2.5 flex flex-col gap-1.5"
                          >
                            {/* 卡片頭：點整排可以展開 / 收合 */}
                            <div
                              className="flex items-center justify-between cursor-pointer select-none"
                              onClick={() => toggleLessonExpanded(lesson.id)}
                            >
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-400">
                                  {lesson.date}
                                </span>
                                <span className="text-slate-700">
                                  {lesson.note || "（無備註）"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">
                                  共 {lesson.exercises.length} 個動作
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // 不要觸發展開
                                    handleDeleteLesson(lesson.id);
                                  }}
                                  className="text-[11px] px-2 py-1 rounded-full border border-slate-300 hover:bg-red-50 hover:border-red-400 text-slate-500 hover:text-red-500 transition-colors"
                                >
                                  刪除
                                </button>
                                <span
                                  className={`text-slate-400 text-xs transition-transform ${
                                    expanded ? "rotate-90" : ""
                                  }`}
                                >
                                  ▶
                                </span>
                              </div>
                            </div>

                            {/* 展開時才顯示動作清單 */}
                            {expanded && (
                              <ul className="mt-2 space-y-1">
                                {lesson.exercises.map((ex) => (
                                  <li
                                    key={ex.id}
                                    className="flex justify-between text-[11px] text-slate-600"
                                  >
                                    <span>{ex.name}</span>
                                    <span>
                                      {ex.weight}kg × {ex.reps} × {ex.sets}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

              </>
            ) : (
              /* ===== 體重 Tab ===== */
              <>
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500">
                    體重紀錄
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">日期</span>
                      <input
                        type="date"
                        value={weightDate}
                        onChange={(e) => setWeightDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="block text-xs text-slate-500">
                        體重 (kg)
                      </span>
                      <input
                        value={weightRecord}
                        onChange={(e) => setWeightRecord(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                        placeholder="例如：55.4"
                        inputMode="decimal"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleAddWeight}
                    disabled={!selectedStudentId}
                    className="mt-1 w-full rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-semibold py-2 transition-colors"
                  >
                    ＋ 新增體重紀錄
                  </button>
                </div>

                {/* 折線圖 + 列表 */}
                <div className="mt-3 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-600">
                    體重變化（折線圖）
                  </h3>
                  {weightRecordsForSelected.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      尚無體重紀錄，先新增一筆。
                    </p>
                  ) : (
                    <>
                      <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-inner">
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="w-full h-24"
                        >
                          <line
                            x1={0}
                            y1={chartHeight - 10}
                            x2={chartWidth}
                            y2={chartHeight - 10}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                          {linePoints && (
                            <polyline
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              points={linePoints}
                            />
                          )}
                          {weightRecordsForSelected.map((w, index) => {
                            const range =
                              maxWeightForChart - minWeightForChart === 0
                                ? 1
                                : maxWeightForChart - minWeightForChart;
                            const x =
                              (chartWidth * index) /
                              Math.max(
                                weightRecordsForSelected.length - 1,
                                1
                              );
                            const normalized =
                              (w.weight - minWeightForChart) / range;
                            const y =
                              chartHeight -
                              10 -
                              normalized * (chartHeight - 20);
                            return (
                              <circle
                                key={w.id}
                                cx={x}
                                cy={y}
                                r={3}
                                fill="#ef4444"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      <ul className="space-y-1 text-xs text-slate-700">
                        {weightRecordsForSelected.map((w) => (
                          <li
                            key={w.id}
                            className="flex justify-between items-center rounded-xl bg-slate-50 border border-slate-200 px-3 py-2"
                          >
                            <span>{w.date}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {w.weight} kg
                              </span>
                              <button
                                onClick={() => handleDeleteWeight(w.id)}
                                className="text-[11px] px-2 py-1 rounded-full border border-slate-300 hover:bg-red-50 hover:border-red-400 text-slate-500 hover:text-red-500 transition-colors"
                              >
                                刪除
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Undo Snackbar */}
      {lastDeleted && (
        <div className="fixed bottom-4 right-4 flex justify-end px-4 pointer-events-none">
          <div className="pointer-events-auto bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
            <span className="text-xs text-slate-700">
              {lastDeleted.kind === "lesson"
                ? "已刪除一堂課程紀錄。"
                : "已刪除一筆體重紀錄。"}
            </span>
            <button
              onClick={handleUndo}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              復原
            </button>
            <button
              onClick={() => setLastDeleted(null)}
              className="text-[11px] text-slate-400 hover:text-slate-600"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
