import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8000";

type MonthSection = {
  month: string;
  label: string;
  days: string[];
};

/** Заголовок недели: колонки сетки идут с понедельника (первая колонка = Пн). */
const WEEK_HEADER = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/**
 * День недели для сетки: пн = 1 … вс = 7.
 * (JS getDay: 0 = вс, 1 = пн — переводим в ISO-подобную шкалу для строки календаря.)
 */
function mondayFirstWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

type CalendarCell =
  | { kind: "empty" }
  | { kind: "day"; iso: string; dayOfMonth: number };

/**
 * Матрица месяца: ведущие пустые ячейки до 1-го числа, дни месяца, хвост до кратности 7.
 */
function buildCalendarMatrix(section: MonthSection): CalendarCell[] {
  const [yStr, mStr] = section.month.split("-");
  const y = Number(yStr);
  const m = Number(mStr) - 1;
  const first = new Date(y, m, 1, 12, 0, 0, 0);
  const leading = mondayFirstWeekday(first) - 1;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) cells.push({ kind: "empty" });
  for (const iso of section.days) {
    const dom = Number(iso.slice(-2));
    cells.push({ kind: "day", iso, dayOfMonth: dom });
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push({ kind: "empty" });
  return cells;
}

/** Тот же горизонт, что у шахматки: 12 месяцев от текущего. */
function buildMonthSections(monthCount: number): MonthSection[] {
  const sections: MonthSection[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const base = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = base.getFullYear();
    const m = base.getMonth();
    const month = `${y}-${String(m + 1).padStart(2, "0")}`;
    const label = base.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const dim = new Date(y, m + 1, 0).getDate();
    const days: string[] = [];
    for (let d = 1; d <= dim; d++) {
      days.push(
        `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
    sections.push({ month, label, days });
  }
  return sections;
}

type PriceMapEntry = { price: number | null; is_blocked: boolean };

type ApiRow = {
  date: string;
  price: number | null;
  is_blocked: boolean;
  comment: string | null;
};

/** Как в App.tsx / вкладка «События» (id, date для попадания в ячейку). */
type EventItem = {
  id: string;
  date: string;
  title: string;
  type: "holiday" | "city";
};

function normalizeRange(start: string, end: string): { lo: string; hi: string } {
  return start <= end ? { lo: start, hi: end } : { lo: end, hi: start };
}

function isDayInRange(day: string, start: string, end: string): boolean {
  const { lo, hi } = normalizeRange(start, end);
  return day >= lo && day <= hi;
}

type PriceCalendarProps = {
  apartmentId?: number;
  events: EventItem[];
  enabledEvents: Record<string, boolean>;
};

export default function PriceCalendar({
  apartmentId = 1,
  events,
  enabledEvents,
}: PriceCalendarProps) {
  const months = useMemo(() => buildMonthSections(12), []);
  const todayKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    () => {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return { [key]: true };
    },
  );

  const [priceMap, setPriceMap] = useState<Record<string, PriceMapEntry>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /** Диапазон выбора: первый клик — точка, второй — вторая граница; затем клик начинает заново. */
  const [rangePick, setRangePick] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const fetchBounds = useMemo(() => {
    if (months.length === 0) return null;
    const start_date = months[0].days[0];
    const lastMonth = months[months.length - 1];
    const end_date = lastMonth.days[lastMonth.days.length - 1];
    return { start_date, end_date };
  }, [months]);

  useEffect(() => {
    if (!fetchBounds) return;
    const { start_date, end_date } = fetchBounds;
    const url = new URL(`${API_BASE}/api/price-calendar/`);
    url.searchParams.set("apartment_id", String(apartmentId));
    url.searchParams.set("start_date", start_date);
    url.searchParams.set("end_date", end_date);

    setLoading(true);
    setLoadError(null);
    fetch(url.toString())
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<ApiRow[]>;
      })
      .then((rows) => {
        const next: Record<string, PriceMapEntry> = {};
        for (const r of rows) {
          next[r.date] = { price: r.price, is_blocked: r.is_blocked };
        }
        setPriceMap(next);
      })
      .catch(() => {
        setLoadError("Не удалось загрузить цены");
        setPriceMap({});
      })
      .finally(() => setLoading(false));
  }, [apartmentId, fetchBounds]);

  function toggleMonth(monthKey: string) {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  }

  function isMonthExpanded(monthKey: string) {
    return expandedMonths[monthKey] === true;
  }

  function onPriceCellClick(day: string) {
    setRangePick((prev) => {
      if (!prev) return { start: day, end: day };
      if (prev.start === prev.end) return { start: prev.start, end: day };
      return { start: day, end: day };
    });
  }

  const showActionBar = rangePick != null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col pb-20">
      <div className="mb-2 text-sm text-gray-600">
        Квартира #{apartmentId} · гостевые цены по дням
      </div>
      {loading ? <p className="text-sm text-gray-500">Загрузка…</p> : null}
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <div className="bg-white flex min-h-[12rem] min-w-0 flex-1 flex-col rounded-xl p-4 shadow max-h-[calc(100vh-10rem)]">
        <div className="min-h-0 flex-1 overflow-auto -mx-1 px-1">
          <div className="min-w-0 space-y-2 text-sm">
            {months.map((section) => (
              <div key={section.month} className="min-w-0">
                <button
                  type="button"
                  className="w-full cursor-pointer border-y border-gray-200 bg-gray-100 px-2 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-200"
                  onClick={() => toggleMonth(section.month)}
                  aria-expanded={isMonthExpanded(section.month)}
                >
                  {section.label}
                  <span className="ml-2 font-normal text-gray-500">
                    {isMonthExpanded(section.month) ? "▼" : "▶"}
                  </span>
                </button>

                {isMonthExpanded(section.month) ? (
                  <div className="mt-2 space-y-1">
                    <div className="grid grid-cols-7 gap-1">
                      {WEEK_HEADER.map((w) => (
                        <div
                          key={w}
                          className="py-1 text-center text-xs font-medium text-gray-500"
                        >
                          {w}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {buildCalendarMatrix(section).map((cell, idx) => {
                        if (cell.kind === "empty") {
                          return (
                            <div
                              key={`empty-${section.month}-${idx}`}
                              className="h-16 w-full min-h-[4rem] rounded-md"
                              aria-hidden
                            />
                          );
                        }
                        const day = cell.iso;
                        const dateObj = new Date(day + "T12:00:00");
                        const isWeekend =
                          dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const entry = priceMap[day];
                        const inRange =
                          rangePick != null &&
                          isDayInRange(day, rangePick.start, rangePick.end);
                        const blocked = entry?.is_blocked === true;
                        const isToday = day === todayKey;
                        const hasEvent = events.some(
                          (e) =>
                            e.date === day && enabledEvents[e.id] !== false,
                        );
                        const priceText =
                          entry?.price != null &&
                          !Number.isNaN(Number(entry.price))
                            ? `${entry.price} ₽`
                            : "—";

                        /**
                         * Порядок: диапазон → blocked → выходной → будний → кольцо события → «сегодня».
                         */
                        let cellCls =
                          "h-16 w-full min-h-[4rem] cursor-pointer flex flex-col border p-1 rounded-md transition-colors ";
                        if (inRange) {
                          cellCls +=
                            "bg-blue-300 border-blue-400 hover:bg-blue-400 ";
                        } else if (blocked) {
                          cellCls += "border-gray-200 bg-gray-200 ";
                        } else if (isWeekend) {
                          cellCls += "bg-blue-100 border-gray-200 ";
                        } else {
                          cellCls +=
                            "border-gray-200 bg-white hover:border-blue-300 ";
                        }
                        if (hasEvent) {
                          cellCls += "ring-2 ring-purple-500 ";
                        }
                        if (isToday) {
                          cellCls += "ring-2 ring-green-500 ring-inset ";
                        }

                        return (
                          <button
                            key={day}
                            type="button"
                            className={cellCls}
                            onClick={() => onPriceCellClick(day)}
                          >
                            <span
                              className={
                                "text-xs self-start leading-none font-semibold " +
                                (isWeekend ? "text-blue-600 " : "text-gray-500 ")
                              }
                            >
                              {cell.dayOfMonth}
                            </span>
                            <span
                              className={
                                "mt-auto flex w-full flex-1 items-end justify-center pb-0.5 text-center text-xs text-gray-600 " +
                                (blocked ? "line-through " : "")
                              }
                            >
                              {priceText}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showActionBar ? (
        <div className="fixed bottom-0 left-48 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          <button
            type="button"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900"
            onClick={() => {
              if (!rangePick) return;
              const { lo, hi } = normalizeRange(rangePick.start, rangePick.end);
              console.log("Price calendar range", {
                apartmentId,
                start_date: lo,
                end_date: hi,
              });
            }}
          >
            Настроить даты
          </button>
        </div>
      ) : null}
    </div>
  );
}
