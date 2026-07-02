"use client";

import { useEffect, useState } from "react";
import { SegTabs } from "@/components/ui/SegTabs";
import { CheckBox } from "@/components/ui/CheckBox";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { SUBJECTS } from "@/lib/subjects";

interface TodoItem {
  id: string;
  subject: string;
  title: string;
  done: boolean;
  memo: string | null;
  photoUrl: string | null;
  bookId: string | null;
  materialLabel: string | null;
}

interface BookOption {
  id: string;
  title: string;
  subject: string;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface WeekTodo {
  id: string;
  subject: string;
  title: string;
  done: boolean;
  materialLabel: string | null;
}
interface WeekDay {
  day: string;
  date: string;
  iso: string;
  done: number;
  total: number;
  today: boolean;
  todos: WeekTodo[];
}

export function Todo() {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [viewDate, setViewDate] = useState(todayIso());
  const [todayLabel, setTodayLabel] = useState("");
  const [isToday, setIsToday] = useState(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [week, setWeek] = useState<{ weekLabel: string; days: WeekDay[] } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [books, setBooks] = useState<BookOption[]>([]);

  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [bookId, setBookId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  function loadDaily(forDate: string) {
    fetch(`/api/todos?range=today&date=${forDate}`)
      .then((r) => r.json())
      .then((d) => {
        setTodayLabel(d.todayLabel);
        setIsToday(d.isToday);
        setTodos(d.todos);
      });
  }
  function loadWeekly() {
    fetch("/api/todos?range=week")
      .then((r) => r.json())
      .then(setWeek);
  }

  useEffect(() => {
    loadDaily(viewDate);
  }, [viewDate]);

  useEffect(() => {
    if (tab === "weekly" && !week) loadWeekly();
  }, [tab, week]);

  async function toggle(id: string, current: boolean) {
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, done: !current } : t)));
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !current }),
    });
  }

  async function toggleWeekTodo(id: string, current: boolean) {
    setWeek((w) =>
      w
        ? {
            ...w,
            days: w.days.map((d) => ({
              ...d,
              todos: d.todos.map((t) => (t.id === id ? { ...t, done: !current } : t)),
              done: d.todos.some((t) => t.id === id) ? d.done + (current ? -1 : 1) : d.done,
            })),
          }
        : w
    );
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !current }),
    });
  }

  async function ensureBooksLoaded() {
    if (books.length === 0) {
      const list = await fetch("/api/materials/books").then((r) => r.json());
      setBooks(list);
      return list as BookOption[];
    }
    return books;
  }

  function openAddForDate(forDate: string) {
    setSubject(SUBJECTS[0]);
    setTitle("");
    setBookId("");
    setDate(forDate);
    ensureBooksLoaded();
    setEditing(null);
    setAddOpen(true);
  }

  function openAdd() {
    openAddForDate(viewDate);
  }

  async function openEdit(t: TodoItem) {
    setSubject(t.subject);
    setTitle(t.title);
    setBookId(t.bookId || "");
    setDate(viewDate);
    await ensureBooksLoaded();
    setEditing(t);
    setAddOpen(true);
  }

  async function submitAdd() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const book = books.find((b) => b.id === bookId);
    if (editing) {
      await fetch(`/api/todos/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          title: title.trim(),
          date,
          bookId: bookId || null,
          materialLabel: book ? book.title : null,
        }),
      });
    } else {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          title: title.trim(),
          date,
          bookId: bookId || undefined,
          materialLabel: book ? book.title : undefined,
        }),
      });
    }
    setSaving(false);
    setAddOpen(false);
    setEditing(null);
    loadDaily(viewDate);
    setWeek(null);
  }

  async function deleteTodo(id: string) {
    if (!window.confirm("이 투두를 삭제할까요?")) return;
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    loadDaily(viewDate);
    setWeek(null);
  }

  return (
    <div>
      <SegTabs
        tabs={[
          { id: "daily" as const, label: "데일리 투두" },
          { id: "weekly" as const, label: "주간 계획" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "daily" ? (
        <>
          <div className="flex items-center justify-between pt-8 lg:pt-10">
            <div className="flex items-center gap-2.5">
              <button onClick={() => { setOpenActionsId(null); setViewDate((d) => shiftIso(d, -1)); }} aria-label="전날" className="border-none bg-none p-1 text-[16px] text-[#161616]/50">
                ‹
              </button>
              <p className="m-0 text-[15px] leading-6 text-[#161616]/60 lg:text-[16px]">{todayLabel}</p>
              <button onClick={() => { setOpenActionsId(null); setViewDate((d) => shiftIso(d, 1)); }} aria-label="다음날" className="border-none bg-none p-1 text-[16px] text-[#161616]/50">
                ›
              </button>
              {!isToday && (
                <button onClick={() => { setOpenActionsId(null); setViewDate(todayIso()); }} className="border-none bg-none p-0 text-[13px] text-[#003ce0] underline underline-offset-[3px]">
                  오늘로
                </button>
              )}
            </div>
          </div>
          <div className="flex items-baseline justify-between border-b border-[#161616]/96 pt-2 pb-4 lg:pb-5">
            <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">
              투두 {todos.length}개
            </p>
            <button onClick={openAdd} className="border-none bg-none p-0 text-[14px] text-[#161616] underline underline-offset-[3px] lg:text-[16px]">
              + 투두 추가
            </button>
          </div>
          {todos.map((t) => (
            <div key={t.id} className="flex items-start gap-3.5 border-b border-[#16161614] py-4 lg:py-5">
              <CheckBox checked={t.done} onClick={() => toggle(t.id, t.done)} />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge>{t.subject}</Badge>
                    {t.materialLabel && (
                      <span className="truncate text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
                        🔗 {t.materialLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-none items-center gap-2.5">
                    {openActionsId === t.id ? (
                      <>
                        <button onClick={() => { setOpenActionsId(null); openEdit(t); }} className="border-none bg-none p-0 text-[12px] text-[#161616]/50 underline underline-offset-[3px] lg:text-[13px]">
                          수정
                        </button>
                        <button onClick={() => deleteTodo(t.id)} className="border-none bg-none p-0 text-[12px] text-[#e0362f]/80 underline underline-offset-[3px] lg:text-[13px]">
                          삭제
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setOpenActionsId(t.id)} aria-label="수정·삭제" className="border-none bg-none p-1 text-[13px] text-[#161616]/40">
                        ✎
                      </button>
                    )}
                  </div>
                </div>
                <p className={`m-0 mb-1.5 text-[15px] leading-6 lg:text-[16px] lg:leading-7 ${t.done ? "text-[#161616]/40 line-through" : "text-[#161616]"}`}>
                  {t.title}
                </p>
                <TodoVerify todo={t} onSaved={() => loadDaily(viewDate)} />
              </div>
            </div>
          ))}
          {todos.length === 0 && <p className="m-0 py-12 text-center text-[14px] text-[#161616]/40">{isToday ? "오늘" : "해당 날짜에"} 등록된 투두가 없습니다.</p>}
        </>
      ) : (
        week && (
          <>
            <div className="border-b border-[#161616]/96 pt-8 pb-4 lg:pt-10 lg:pb-5">
              <p className="m-0 text-[18px] leading-7 font-semibold text-[#161616] lg:text-[20px] lg:leading-8">{week.weekLabel}</p>
            </div>
            {week.days.map((d) => (
              <div key={d.iso} className="border-b border-[#16161614] py-4 lg:py-5">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <p className={`m-0 text-[15px] leading-6 lg:text-[16px] ${d.today ? "font-semibold text-[#161616]" : "text-[#161616]/70"}`}>
                    {d.day}
                    <span className="ml-1.5 text-[12px] font-normal text-[#161616]/40 lg:text-[13px]">{d.date}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[#161616]/40 lg:text-[13px]">
                      {d.done} / {d.total}
                    </span>
                    <button onClick={() => openAddForDate(d.iso)} className="border-none bg-none p-0 text-[12px] text-[#161616] underline underline-offset-[3px] lg:text-[13px]">
                      + 추가
                    </button>
                  </div>
                </div>
                {d.todos.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-1.5">
                    <CheckBox checked={t.done} onClick={() => toggleWeekTodo(t.id, t.done)} />
                    <Badge>{t.subject}</Badge>
                    <p className={`m-0 min-w-0 flex-1 truncate text-[14px] leading-6 lg:text-[15px] ${t.done ? "text-[#161616]/40 line-through" : "text-[#161616]"}`}>
                      {t.title}
                    </p>
                  </div>
                ))}
                {d.todos.length === 0 && <p className="m-0 py-1.5 text-[13px] text-[#161616]/30">등록된 투두가 없습니다.</p>}
              </div>
            ))}
            <p className="m-0 pt-5 text-[13px] leading-5 text-[#161616]/50 lg:text-[14px] lg:leading-6">
              * 교재의 Day 단위를 주간 투두로 등록하면 매일 자동으로 데일리 투두에 배치됩니다.
            </p>
          </>
        )
      )}

      <Sheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
      >
        <h2 className="m-0 mb-6 text-[22px] leading-8 font-normal text-[#161616] lg:text-[26px] lg:leading-[38px]">{editing ? "투두 수정" : "투두 추가"}</h2>
        <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">과목</p>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">내용</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) Day 03 · 독서 지문 2개 분석"
          className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
        />
        <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">연동 학습자료 (선택)</p>
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="mb-5 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
        >
          <option value="">연동 안 함</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.subject} · {b.title}
            </option>
          ))}
        </select>
        <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">날짜</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-8 w-full border-0 border-b border-[#161616]/50 bg-transparent py-3 text-[16px] text-[#161616] outline-none"
        />
        <div className="flex gap-3">
          <button
            onClick={() => {
              setAddOpen(false);
              setEditing(null);
            }}
            className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]"
          >
            취소
          </button>
          <button onClick={submitAdd} disabled={saving || !title.trim()} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
            {editing ? "저장하기" : "추가하기"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function TodoVerify({ todo, onSaved }: { todo: TodoItem; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(todo.memo || "");
  const [photoUrl, setPhotoUrl] = useState(todo.photoUrl);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo, photoUrl, done: true }),
    });
    setSaving(false);
    setOpen(false);
    onSaved();
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="border-none bg-none p-0 text-[13px] leading-5 text-[#002a9e] underline underline-offset-[3px] lg:text-[14px] lg:leading-6">
        완료 인증 · 메모{todo.photoUrl ? " ✓" : ""}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} maxWidth={480}>
        <h2 className="m-0 mb-1 text-[20px] leading-8 font-normal text-[#161616]">{todo.title}</h2>
        <p className="m-0 mb-6 text-[13px] text-[#161616]/50">완료 인증 사진과 메모를 남겨보세요.</p>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="인증 사진" className="mb-4 w-full border border-[#16161614] object-cover" />
        )}
        <label className="mb-5 flex w-full cursor-pointer items-center justify-center border border-dashed border-[#c6c6c6] py-3 text-[14px] text-[#161616]/60">
          사진 선택
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </label>

        <p className="m-0 mb-2 text-[13px] leading-5 font-semibold text-[#161616]">학습 메모</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          placeholder="오늘 학습 내용을 기록하세요."
          className="mb-6 w-full resize-none border border-[#16161614] bg-transparent p-3 text-[14px] leading-6 text-[#161616] outline-none"
        />
        <div className="flex gap-3">
          <button onClick={() => setOpen(false)} className="w-[100px] flex-none rounded-[2px] border border-[#161616] bg-white py-3.5 text-[15px] font-medium text-[#161616]">
            취소
          </button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-[2px] border-none bg-[#161616] py-3.5 text-[16px] font-semibold text-white disabled:opacity-50">
            저장
          </button>
        </div>
      </Sheet>
    </>
  );
}
