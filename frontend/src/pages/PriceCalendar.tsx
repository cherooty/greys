import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:8000";

function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("ru-RU");
}

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
  type: "holiday" | "city" | "custom";
};

function normalizeRange(start: string, end: string): { lo: string; hi: string } {
  return start <= end ? { lo: start, hi: end } : { lo: end, hi: start };
}

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/**
 * Один месяц: «12 – 15 мая 2026 г.»; один день: «15 мая 2026 г.».
 * Другие случаи — ISO «lo — hi».
 */
function formatEditModalRange(start: string, end: string): string {
  const { lo, hi } = normalizeRange(start, end);
  const prLo = lo.split("-");
  const prHi = hi.split("-");
  if (prLo.length !== 3 || prHi.length !== 3) return `${lo} — ${hi}`;
  const y1 = Number(prLo[0]);
  const m1 = Number(prLo[1]);
  const d1 = Number(prLo[2]);
  const y2 = Number(prHi[0]);
  const m2 = Number(prHi[1]);
  const d2 = Number(prHi[2]);
  if (y1 !== y2 || m1 !== m2 || m1 < 1 || m1 > 12) {
    return `${lo} — ${hi}`;
  }
  const month = MONTHS_GENITIVE[m1 - 1];
  if (d1 === d2) {
    return `${d1} ${month} ${y1} г.`;
  }
  return `${d1} – ${d2} ${month} ${y1} г.`;
}

function isDayInRange(day: string, start: string, end: string): boolean {
  const { lo, hi } = normalizeRange(start, end);
  return day >= lo && day <= hi;
}

type PriceCalendarProps = {
  apartmentId?: number;
  events: EventItem[];
  enabledEvents: Record<string, boolean>;
  /** Внешний контейнер крутит скролл (sticky-заголовок в App); без вложенного overflow-auto */
  scrollMode?: "internal" | "parent";
  onAddEvent?: (payload: {
    date: string;
    title: string;
    type: EventItem["type"];
  }) => void;
};

export default function PriceCalendar({
  apartmentId = 1,
  events,
  enabledEvents,
  scrollMode = "internal",
  onAddEvent,
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

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    day: string;
  } | null>(null);
  const [eventModal, setEventModal] = useState<{
    date: string;
    title: string;
    type: EventItem["type"];
  } | null>(null);
  const [eventModalError, setEventModalError] = useState<string | null>(null);
  const [hoverEventTooltip, setHoverEventTooltip] = useState<{
    date: string;
    x: number;
    y: number;
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const modalRef = useRef<HTMLDivElement | null>(null);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EventItem[]> = {};
    for (const event of events) {
      if (enabledEvents[event.id] === false) continue;
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }
    return grouped;
  }, [events, enabledEvents]);

  const hideHoverEventTooltip = () => {
    setHoverEventTooltip((prev) => (prev ? null : prev));
  };

  const [isOpen, setIsOpen] = useState(true);
  const [priceInput, setPriceInput] = useState("");
  const [commentInput, setCommentInput] = useState("");

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setContextMenu(null);
      if (
        !target.closest("[data-price-modal]") &&
        !target.closest("[data-price-context]") &&
        !target.closest("[data-price-event-modal]")
      ) {
        setEditModal(null);
        setEventModal(null);
      }
      setEventModalError(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditModal(null);
        setEventModal(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!editModal) return;
    const { lo } = normalizeRange(editModal.start, editModal.end);
    const entry = priceMap[lo];
    setIsOpen(entry?.is_blocked !== true);
    setPriceInput(
      entry?.price != null && !Number.isNaN(Number(entry.price))
        ? formatPrice(Number(entry.price))
        : "",
    );
    setCommentInput("");
  }, [editModal, priceMap]);

  useEffect(() => {
    if (!editModal || !modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();

    if (rect.bottom > window.innerHeight - 8) {
      setModalPosition((prev) => ({
        ...prev,
        y: prev.y - (rect.bottom - window.innerHeight + 8),
      }));
    }

    if (rect.top < 8) {
      setModalPosition((prev) => ({
        ...prev,
        y: 8,
      }));
    }
  }, [editModal]);

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

  function openEditModal(day: string, e?: MouseEvent) {
    if (rangePick) {
      const { lo, hi } = normalizeRange(rangePick.start, rangePick.end);
      setEditModal({ start: lo, end: hi });
    } else {
      setEditModal({ start: day, end: day });
    }

    if (e) {
      setModalPosition({
        x: Math.max(16, Math.min(e.clientX - 160, window.innerWidth - 340)),
        y: e.clientY + 20,
      });
    }
  }

  function openAddEventModal(day: string) {
    setEventModal({
      date: day,
      title: "",
      type: "holiday",
    });
    setEventModalError(null);
  }

  function saveManualEvent() {
    if (!eventModal) return;
    const title = eventModal.title.trim();
    if (!title) {
      setEventModalError("Введите название события");
      return;
    }
    onAddEvent?.({
      date: eventModal.date,
      title,
      type: eventModal.type,
    });
    setEventModal(null);
    setEventModalError(null);
    setContextMenu(null);
  }

  function placeEventHoverTooltip(
    e: React.MouseEvent<HTMLElement>,
    day: string,
    itemsCount: number,
  ) {
    const padding = 12;
    const tooltipWidth = 240;
    const tooltipHeight = Math.min(220, 36 + itemsCount * 22);
    let x = e.clientX + 12;
    let y = e.clientY + 12;

    if (x + tooltipWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth - padding;
    }
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;

    setHoverEventTooltip({ date: day, x, y });
  }

  function showEventHoverTooltipForDay(
    e: React.MouseEvent<HTMLElement>,
    day: string,
  ) {
    const list = eventsByDate[day];
    if (!list || list.length === 0) return;
    placeEventHoverTooltip(e, day, list.length);
  }

  async function handleSave() {
    if (!editModal) return;
    const { lo, hi } = normalizeRange(editModal.start, editModal.end);
    const digitsOnly = priceInput.replace(/[^\d]/g, "");
    const num = Number(digitsOnly);
    if (isOpen && (digitsOnly === "" || Number.isNaN(num))) {
      alert("Укажите цену");
      return;
    }
    const price = isOpen ? Math.round(num) : null;
    const body = {
      apartment_id: apartmentId,
      start_date: lo,
      end_date: hi,
      price,
      is_blocked: !isOpen,
      comment: commentInput.trim() || null,
    };
    const res = await fetch(`${API_BASE}/api/price-calendar/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      alert("Не удалось сохранить");
      return;
    }
    const rows = (await res.json()) as ApiRow[];
    setPriceMap((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        next[r.date] = {
          price: r.price,
          is_blocked: r.is_blocked,
        };
      }
      return next;
    });
    setEditModal(null);
  }

  const parentScroll = scrollMode === "parent";

  return (
    <div
      className={
        parentScroll
          ? "relative flex min-h-0 min-w-0 flex-col"
          : "relative flex h-full min-h-0 min-w-0 flex-col"
      }
    >
      {!parentScroll ? (
        <div className="mb-2 shrink-0 text-sm text-gray-600">
          Квартира #{apartmentId} · гостевые цены по дням
        </div>
      ) : null}
      {loading ? (
        <p className="shrink-0 text-sm text-gray-500">Загрузка…</p>
      ) : null}
      {loadError ? (
        <p className="shrink-0 text-sm text-red-600">{loadError}</p>
      ) : null}

      <div
        className={
          parentScroll
            ? "flex min-w-0 flex-col p-4"
            : "flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-4 shadow"
        }
      >
        <div
          className={
            parentScroll
              ? "min-w-0 -mx-1 px-1"
              : "min-h-0 flex-1 overflow-auto -mx-1 px-1"
          }
        >
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
                        const hasEvent = Boolean(eventsByDate[day]?.length);
                        const priceText =
                          entry?.price != null &&
                          !Number.isNaN(Number(entry.price))
                            ? `${formatPrice(entry.price)} ₽`
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
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                day,
                              });
                            }}
                            onMouseEnter={(e) => showEventHoverTooltipForDay(e, day)}
                            onMouseMove={(e) => showEventHoverTooltipForDay(e, day)}
                            onMouseLeave={hideHoverEventTooltip}
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
                                "mt-auto flex w-full flex-1 items-end justify-center pb-0.5 text-center text-sm font-medium " +
                                (blocked
                                  ? "line-through text-gray-400 "
                                  : "text-gray-800 ")
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

      {hoverEventTooltip && eventsByDate[hoverEventTooltip.date]?.length ? (
        <div
          className="pointer-events-none fixed z-[9999] max-w-[240px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 shadow-lg"
          style={{
            left: hoverEventTooltip.x,
            top: hoverEventTooltip.y,
          }}
        >
          {eventsByDate[hoverEventTooltip.date]!.length === 1 ? (
            <div>{eventsByDate[hoverEventTooltip.date]![0].title}</div>
          ) : (
            <ul className="space-y-0.5">
              {eventsByDate[hoverEventTooltip.date]!.map((ev) => (
                <li key={ev.id} className="flex items-start gap-1">
                  <span aria-hidden>•</span>
                  <span className="min-w-0">{ev.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {contextMenu ? (
        <div
          data-price-context
          className="fixed z-50 rounded-lg border border-gray-200 bg-white text-sm shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-gray-100"
            onClick={(ev) => {
              openEditModal(contextMenu.day, ev.nativeEvent);
              setContextMenu(null);
            }}
          >
            Изменить
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-gray-100"
            onClick={() => {
              openAddEventModal(contextMenu.day);
              setContextMenu(null);
            }}
          >
            Добавить событие
          </button>
        </div>
      ) : null}

      {eventModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4">
          <div
            data-price-event-modal
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm font-semibold text-gray-900">
              Добавить событие
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Дата
                </label>
                <input
                  type="date"
                  value={eventModal.date}
                  onChange={(e) =>
                    setEventModal((prev) =>
                      prev ? { ...prev, date: e.target.value } : prev,
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Название
                </label>
                <input
                  type="text"
                  value={eventModal.title}
                  onChange={(e) => {
                    setEventModalError(null);
                    setEventModal((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    );
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Например: Концерт"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Тип
                </label>
                <select
                  value={eventModal.type}
                  onChange={(e) =>
                    setEventModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            type: e.target.value as EventItem["type"],
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="holiday">Праздник</option>
                  <option value="city">Городское событие</option>
                  <option value="custom">Другое</option>
                </select>
              </div>

              {eventModalError ? (
                <div className="text-xs text-red-600">{eventModalError}</div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => {
                  setEventModal(null);
                  setEventModalError(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                onClick={saveManualEvent}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editModal ? (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            ref={modalRef}
            data-price-modal
            className="absolute z-50 pointer-events-auto"
            style={{
              top: modalPosition.y,
              left: modalPosition.x,
            }}
          >
            <div className="relative w-[320px] space-y-3 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5">
              <div className="absolute -top-2 left-6 h-3 w-3 rotate-45 bg-white border-l border-t border-gray-200" />
              <div className="text-sm font-semibold">Настроить даты</div>

              <div className="text-base font-semibold text-gray-900">
                {formatEditModalRange(editModal.start, editModal.end)}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={
                    "flex-1 rounded-lg border py-2 text-sm font-medium " +
                    (isOpen
                      ? "border-blue-400 bg-blue-100"
                      : "border-gray-200 bg-white")
                  }
                  onClick={() => setIsOpen(true)}
                >
                  Открыто
                </button>
                <button
                  type="button"
                  className={
                    "flex-1 rounded-lg border py-2 text-sm font-medium " +
                    (!isOpen
                      ? "border-blue-400 bg-blue-100"
                      : "border-gray-200 bg-white")
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Закрыто
                </button>
              </div>

              {isOpen ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">Цена за сутки</span>
                  <div className="relative w-[120px]">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded border border-gray-200 px-2 py-2 pr-6 text-center text-sm"
                      autoFocus={isOpen}
                      value={priceInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        setPriceInput(raw);
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        if (raw) setPriceInput(formatPrice(Number(raw)));
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      ₽
                    </span>
                  </div>
                </div>
              ) : null}

              <textarea
                placeholder="Комментарий"
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
                autoFocus={!isOpen}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={handleSave}
                >
                  Применить
                </button>
                <button
                  type="button"
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => setEditModal(null)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
