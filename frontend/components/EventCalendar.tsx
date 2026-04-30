"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCalendarCategories,
  getCalendarColor,
  getCalendarEvents,
  type RakutenCalendarEvent,
} from "@/lib/events";
import type { MailOutput } from "@/lib/types";

const HIDDEN_KEY = "noahl-calendar-hidden-categories";
const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventsOnDay(
  events: RakutenCalendarEvent[],
  day: Date,
): RakutenCalendarEvent[] {
  const d = startOfDay(day).getTime();
  return events.filter((e) => {
    if (!e.startDate) return false;
    const start = startOfDay(new Date(e.startDate)).getTime();
    const end = e.endDate
      ? startOfDay(new Date(e.endDate)).getTime()
      : start;
    return d >= start && d <= end;
  });
}

export default function EventCalendar({
  outputs = [],
}: {
  outputs?: MailOutput[];
}) {
  const allCategories = getCalendarCategories();
  const allEvents = getCalendarEvents();

  function outputsOnDay(day: Date): MailOutput[] {
    const d = startOfDay(day).getTime();
    return outputs.filter((o) => {
      const dateStr = o.sentAt ?? o.scheduledAt;
      if (!dateStr) return false;
      return startOfDay(new Date(dateStr)).getTime() === d;
    });
  }

  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_KEY);
      if (stored) {
        setHidden(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  function toggleCategory(cat: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }

  const visibleEvents = useMemo(
    () => allEvents.filter((e) => !hidden.has(e.category)),
    [allEvents, hidden],
  );

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 6週間 × 7日 = 42 セル
  const cells: { date: Date; thisMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startWeekday + 1;
    const d = new Date(year, month, dayNum);
    cells.push({ date: d, thisMonth: dayNum >= 1 && dayNum <= daysInMonth });
  }

  const today = new Date();
  const monthEventsCount = visibleEvents.filter((e) => {
    if (!e.startDate) return false;
    const sd = new Date(e.startDate);
    const ed = e.endDate ? new Date(e.endDate) : sd;
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    return sd <= endOfMonth && ed >= startOfMonth;
  }).length;

  function prevMonth() {
    setCursorDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCursorDate(new Date(year, month + 1, 1));
  }
  function thisMonth() {
    setCursorDate(new Date());
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={thisMonth}
            className="text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-50"
          >
            今月
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="text-stone-600 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100"
          >
            ›
          </button>
        </div>
        <div className="text-sm font-semibold text-stone-900">
          {year}年{month + 1}月
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">{monthEventsCount}件</span>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-50"
          >
            フィルタ
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mb-3 p-3 bg-stone-50 border border-stone-200 rounded">
          <div className="text-xs text-stone-600 mb-2">
            表示するイベント分類:
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => {
              const visible = !hidden.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full transition border ${
                    visible
                      ? "text-white border-transparent"
                      : "bg-white text-stone-400 border-stone-300 line-through"
                  }`}
                  style={
                    visible ? { backgroundColor: getCalendarColor(cat) } : {}
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 text-[10px] text-stone-500 border-b border-stone-200 mb-1">
        {WEEK_LABELS.map((l, i) => (
          <div
            key={l}
            className={`py-1 text-center ${i === 0 ? "text-rose-600" : i === 6 ? "text-sky-600" : ""}`}
          >
            {l}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-stone-200">
        {cells.map((c, i) => {
          const evts = eventsOnDay(visibleEvents, c.date);
          const isToday = isSameDay(c.date, today);
          return (
            <div
              key={i}
              className={`bg-white min-h-[70px] p-1 ${c.thisMonth ? "" : "bg-stone-50"}`}
            >
              <div
                className={`text-[10px] mb-0.5 ${
                  isToday
                    ? "inline-block bg-stone-900 text-white rounded-full w-5 h-5 text-center leading-5"
                    : c.thisMonth
                      ? c.date.getDay() === 0
                        ? "text-rose-600"
                        : c.date.getDay() === 6
                          ? "text-sky-600"
                          : "text-stone-700"
                      : "text-stone-300"
                }`}
              >
                {c.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {evts.slice(0, 3).map((e, j) => (
                  <div
                    key={j}
                    className="text-[9px] text-white px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: getCalendarColor(e.category) }}
                    title={`${e.category}\n${e.name}\n告知: ${e.announcementDate?.substring(0, 10) ?? "-"}\n開催: ${e.startDate?.substring(0, 10) ?? "-"} 〜 ${e.endDate?.substring(0, 10) ?? "-"}`}
                  >
                    {e.category}
                  </div>
                ))}
                {evts.length > 3 && (
                  <div className="text-[9px] text-stone-500 pl-1">
                    +{evts.length - 3}
                  </div>
                )}
                {outputsOnDay(c.date).map((o) => (
                  <Link
                    key={o.id}
                    href={`/outputs/${o.id}/`}
                    className="block text-[9px] px-1 py-0.5 rounded truncate border-l-2"
                    style={{
                      backgroundColor: "var(--brand-panel)",
                      borderLeftColor: "var(--brand-accent)",
                      color: "var(--brand-text)",
                    }}
                    title={`配信メルマガ\n${o.title}\nテンプレ ${o.templateId}`}
                  >
                    📧 {o.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
