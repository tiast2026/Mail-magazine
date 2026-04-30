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

type Bar = {
  kind: "event" | "output";
  event?: RakutenCalendarEvent;
  output?: MailOutput;
  startCol: number; // 0..6
  endCol: number; // 0..6
  row: number;
  color: string;
  label: string;
  href?: string;
};

/** ある週内でのイベントバーを計算（行重複しないように row 割り当て） */
function placeBarsForWeek(
  weekStart: Date,
  events: RakutenCalendarEvent[],
  outputs: MailOutput[],
): Bar[] {
  const weekStartTs = startOfDay(weekStart).getTime();
  const weekEndTs = weekStartTs + 6 * 24 * 60 * 60 * 1000;

  type Pre = Omit<Bar, "row">;
  const pre: Pre[] = [];

  // 楽天イベント
  for (const e of events) {
    if (!e.startDate) continue;
    const start = startOfDay(new Date(e.startDate)).getTime();
    const end = startOfDay(
      new Date(e.endDate ?? e.startDate),
    ).getTime();
    if (end < weekStartTs || start > weekEndTs) continue;

    // 「5と0のつく日」は範囲内の 5,10,15,20,25,30 のみマーク
    if (e.category === "5と0のつく日") {
      for (let d = weekStartTs; d <= weekEndTs; d += 24 * 60 * 60 * 1000) {
        if (d < start || d > end) continue;
        const dom = new Date(d).getDate();
        if (dom % 5 !== 0) continue;
        const col = Math.round((d - weekStartTs) / (24 * 60 * 60 * 1000));
        pre.push({
          kind: "event",
          event: e,
          startCol: col,
          endCol: col,
          color: getCalendarColor(e.category),
          label: e.category,
        });
      }
      continue;
    }

    const cs = Math.max(weekStartTs, start);
    const ce = Math.min(weekEndTs, end);
    const startCol = Math.round((cs - weekStartTs) / (24 * 60 * 60 * 1000));
    const endCol = Math.round((ce - weekStartTs) / (24 * 60 * 60 * 1000));
    pre.push({
      kind: "event",
      event: e,
      startCol,
      endCol,
      color: getCalendarColor(e.category),
      label: e.category,
    });
  }

  // 配信メルマガ（単日）
  for (const o of outputs) {
    const dateStr = o.sentAt ?? o.scheduledAt;
    if (!dateStr) continue;
    const d = startOfDay(new Date(dateStr)).getTime();
    if (d < weekStartTs || d > weekEndTs) continue;
    const col = Math.round((d - weekStartTs) / (24 * 60 * 60 * 1000));
    pre.push({
      kind: "output",
      output: o,
      startCol: col,
      endCol: col,
      color: "var(--brand-accent)",
      label: `📧 ${o.title}`,
      href: `/outputs/${o.id}/`,
    });
  }

  // 行（row）割り当て：長いバーから優先、衝突を避ける
  pre.sort((a, b) => {
    const lenA = a.endCol - a.startCol;
    const lenB = b.endCol - b.startCol;
    if (lenA !== lenB) return lenB - lenA;
    return a.startCol - b.startCol;
  });

  const rows: Array<Set<number>> = [];
  const result: Bar[] = [];
  for (const p of pre) {
    let r = 0;
    while (true) {
      if (!rows[r]) rows[r] = new Set();
      let collide = false;
      for (let c = p.startCol; c <= p.endCol; c++) {
        if (rows[r].has(c)) {
          collide = true;
          break;
        }
      }
      if (!collide) {
        for (let c = p.startCol; c <= p.endCol; c++) rows[r].add(c);
        result.push({ ...p, row: r });
        break;
      }
      r++;
    }
  }
  return result;
}

export default function EventCalendar({
  outputs = [],
}: {
  outputs?: MailOutput[];
}) {
  const allCategories = getCalendarCategories();
  const allEvents = getCalendarEvents();

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

  const visibleEvents = useMemo(() => {
    const filtered = allEvents.filter((e) => !hidden.has(e.category));
    // 同じ「イベント分類」かつ同じ期間（開始日時・終了日時）のイベントは1件にまとめる
    const seen = new Map<string, RakutenCalendarEvent>();
    for (const e of filtered) {
      const key = `${e.category}|${e.startDate ?? ""}|${e.endDate ?? ""}`;
      if (!seen.has(key)) seen.set(key, e);
    }
    return Array.from(seen.values());
  }, [allEvents, hidden]);

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

  // 7日ずつ週に分割
  const weeks: { date: Date; thisMonth: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
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

  const ROW_HEIGHT = 18;

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

      <div className="border-t border-stone-200">
        {weeks.map((week, wi) => {
          const bars = placeBarsForWeek(
            week[0].date,
            visibleEvents,
            outputs,
          );
          const maxRow = bars.reduce((m, b) => Math.max(m, b.row), -1);
          const barsAreaHeight = (maxRow + 1) * (ROW_HEIGHT + 2);
          const cellMinHeight = Math.max(70, 24 + barsAreaHeight + 4);

          return (
            <div
              key={wi}
              className="relative grid grid-cols-7 border-b border-stone-200"
              style={{ minHeight: cellMinHeight }}
            >
              {week.map((c, ci) => {
                const isToday = isSameDay(c.date, today);
                return (
                  <div
                    key={ci}
                    className={`border-r border-stone-200 last:border-r-0 p-1 ${c.thisMonth ? "" : "bg-stone-50"}`}
                  >
                    <div
                      className={`text-[10px] inline-block ${
                        isToday
                          ? "bg-stone-900 text-white rounded-full w-5 h-5 text-center leading-5"
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
                  </div>
                );
              })}

              {/* 連続バーをセル上にオーバーレイ */}
              <div className="absolute inset-0 pointer-events-none">
                {bars.map((b, bi) => {
                  const left = (b.startCol / 7) * 100;
                  const width = ((b.endCol - b.startCol + 1) / 7) * 100;
                  const top = 24 + b.row * (ROW_HEIGHT + 2);
                  const style: React.CSSProperties = {
                    position: "absolute",
                    left: `calc(${left}% + 2px)`,
                    width: `calc(${width}% - 4px)`,
                    top,
                    height: ROW_HEIGHT,
                  };
                  if (b.kind === "event") {
                    return (
                      <div
                        key={bi}
                        className="text-[10px] text-white px-1.5 rounded truncate flex items-center pointer-events-auto"
                        style={{ ...style, backgroundColor: b.color }}
                        title={`${b.event!.category}\n${b.event!.name}\n告知: ${b.event!.announcementDate?.substring(0, 10) ?? "-"}\n開催: ${b.event!.startDate?.substring(0, 10) ?? "-"} 〜 ${b.event!.endDate?.substring(0, 10) ?? "-"}`}
                      >
                        {b.label}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={bi}
                      href={b.href!}
                      className="text-[10px] px-1.5 rounded truncate flex items-center pointer-events-auto border-l-2 hover:brightness-95"
                      style={{
                        ...style,
                        backgroundColor: "var(--brand-panel)",
                        borderLeftColor: "var(--brand-accent)",
                        color: "var(--brand-text)",
                      }}
                      title={`配信メルマガ\n${b.output!.title}\nテンプレ ${b.output!.templateId}`}
                    >
                      {b.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
