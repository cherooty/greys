import React, { useEffect, useMemo, useRef, useState } from "react";
import { ApartmentForm } from "./components/ApartmentForm";
import { ApartmentsList, type Apartment } from "./components/ApartmentsList";
import PriceCalendar from "./pages/PriceCalendar";

type Booking = {
  id: number;
  apartment_id: number;
  check_in_date: string;
  check_out_date: string;
  guest_name?: string;
  total_price?: number;
  owner_price?: number | null;
  guests_count?: number | null;
  currency?: string;
  status?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  notes?: string | null;
  source?: string;
  guest_contact?: string | null;
  messengers?: string | null;
  commission_price?: number | null;
  commission_percent?: number | null;
  paid_amount?: number | null;
  paid_date?: string | null;
  payment_method?: string | null;
};

type Source = {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
};

const INITIAL_SOURCES: Source[] = [
  {
    id: "avito",
    name: "Авито",
    enabled: true,
    color: "bg-red-200",
  },
  {
    id: "sutochno",
    name: "Суточно",
    enabled: true,
    color: "bg-green-200",
  },
  {
    id: "cian",
    name: "ЦИАН",
    enabled: true,
    color: "bg-blue-200",
  },
  {
    id: "yandex",
    name: "Яндекс",
    enabled: true,
    color: "bg-yellow-200",
  },
  {
    id: "manual",
    name: "Вручную",
    enabled: true,
    color: "bg-gray-200",
  },
];

function formatRubMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const s = Math.round(amount)
    .toLocaleString("ru-RU", { maximumFractionDigits: 0 })
    .replace(/\u00a0/g, " ");
  return `${s} ₽`;
}

function digitsOnlyRub(s: string): string {
  return s.replace(/[^\d]/g, "");
}

function rubDigitsToDisplay(digits: string): string {
  if (!digits) return "";
  const n = Number(digits);
  if (Number.isNaN(n)) return "";
  return formatRubMoney(n);
}

function formatTimelineRub(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const s = Math.round(amount)
    .toLocaleString("ru-RU", { maximumFractionDigits: 0 })
    .replace(/\u00a0/g, " ");
  return `₽${s}`;
}

function timelineNightsCount(checkInDate: string, checkOutDate: string): number {
  const inDate = new Date(checkInDate + "T12:00:00");
  const outDate = new Date(checkOutDate + "T12:00:00");
  const raw = Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
  return Math.max(1, Number.isFinite(raw) ? raw : 1);
}

function formatTimelineNights(checkInDate: string, checkOutDate: string): string {
  const nights = timelineNightsCount(checkInDate, checkOutDate);
  const mod10 = nights % 10;
  const mod100 = nights % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "ночь"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "ночи"
        : "ночей";
  return `${nights} ${word}`;
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timelineApartmentDotClass(apartmentName: string): string {
  const key = apartmentName.trim().toLowerCase();
  if (key === "блюз" || key === "blues") return "bg-sky-500";
  if (key === "маки" || key === "maki") return "bg-red-500";
  return "bg-gray-400";
}

function formatArrivalsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  return mod10 === 1 && mod100 !== 11 ? `${count} заезд` : `${count} заездов`;
}

function formatNightsCountRu(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "ночь"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "ночи"
        : "ночей";
  return `${count} ${word}`;
}

function formatGuestsCountRu(count: number | null | undefined): string {
  if (count == null || count <= 0) return "—";
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "гость"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "гостя"
        : "гостей";
  return `${count} ${word}`;
}

function formatTimelinePayout(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const s = Math.round(amount)
    .toLocaleString("ru-RU", { maximumFractionDigits: 0 })
    .replace(/\u00a0/g, " ");
  return `+ ${s} ₽`;
}

function formatCheckInTimeCompact(raw: string | null | undefined): string {
  return normalizeTimeHhMm(raw ?? "") || "—";
}

function formatCheckoutCompact(
  checkOutDate: string,
  rawTime: string | null | undefined,
): string {
  const date = new Date(`${checkOutDate}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const time = normalizeTimeHhMm(rawTime ?? "");
  return time ? `${date} ${time}` : date;
}

function formatTimelineDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
  const weekday = weekdays[d.getDay()] ?? "";
  const day = d.getDate();
  const month = d.toLocaleDateString("ru-RU", {
    month: "long",
  });
  return `${day} ${month}, ${weekday}`;
}

function isTimelineWeekend(isoDate: string): boolean {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
}

type EventItem = {
  id: string;
  date: string;
  title: string;
  type: "holiday" | "city";
};

type BookingsResizableKey = "guest" | "comment";
type BookingsViewMode = "table" | "timeline";
type BookingSourceKey = keyof typeof SOURCES;
type TimelineArrivalItem = {
  day: string;
  items: {
    id: number;
    apartmentSortKey: string;
    apartmentName: string;
    guestLine: string;
    sourceLabel: string;
    apartmentDotClass: string;
    checkInTimeLabel: string;
    sourceBadgeClass: string;
    nightsLabel: string;
    payoutLabel: string;
    checkoutLabel: string;
    payoutHasValue: boolean;
  }[];
};

const BOOKINGS_COL_MIN: Record<BookingsResizableKey, number> = {
  guest: 140,
  comment: 120,
};

/** Высота строки дня в шахматке (rem), согласована с class h-8 */
const ROW_HEIGHT = 2;

const API_BASE = "http://localhost:8000";

const events: EventItem[] = [
  { id: "1", date: "2026-05-01", title: "Праздник весны", type: "holiday" },
  { id: "2", date: "2026-05-02", title: "Выходные", type: "holiday" },
  { id: "3", date: "2026-05-09", title: "День Победы", type: "holiday" },
  { id: "4", date: "2026-05-07", title: "Концерт в городе", type: "city" },
];

type MonthSection = {
  month: string;
  label: string;
  days: string[];
};

const RUSSIAN_MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сент.",
  "окт",
  "ноя",
  "дек",
] as const;

const holidays: Record<string, string> = {
  "2026-05-01": "Праздник",
  "2026-05-02": "Праздник",
  "2026-05-03": "Праздник",
  "2026-05-09": "Праздник",
  "2026-05-10": "Праздник",
  "2026-05-11": "Праздник",
};

const apartmentColors: Record<string, string> = {
  Блюз: "bg-sky-50",
  Маки: "bg-purple-50",
};

const SOURCES = {
  manual: {
    id: "manual",
    label: "Вручную",
    color: "bg-green-200",
    barBorder: "border-green-400",
  },
  avito: {
    id: "avito",
    label: "Авито",
    color: "bg-red-200",
    barBorder: "border-red-400",
  },
  sutochno: {
    id: "sutochno",
    label: "Суточно",
    color: "bg-purple-200",
    barBorder: "border-purple-400",
  },
  cian: {
    id: "cian",
    label: "ЦИАН",
    color: "bg-sky-200",
    barBorder: "border-sky-400",
  },
  yandex: {
    id: "yandex",
    label: "Яндекс.Путешествия",
    color: "bg-yellow-200",
    barBorder: "border-yellow-400",
  },
} as const;

function bookingCellSourceColorClasses(source: string | undefined): string {
  const key =
    source != null && source in SOURCES
      ? (source as keyof typeof SOURCES)
      : "manual";
  const c = SOURCES[key]?.color ?? SOURCES.manual.color;
  const hover =
    key === "avito"
      ? "hover:bg-red-300"
      : key === "sutochno"
        ? "hover:bg-purple-300"
        : key === "cian"
          ? "hover:bg-sky-300"
          : key === "yandex"
            ? "hover:bg-yellow-300"
            : "hover:bg-green-300";
  return `${c} ${hover}`;
}

function formatDay(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = Number(parts[2]);
  const monthIdx = Number(parts[1]) - 1;
  if (!Number.isFinite(d) || monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${d} ${RUSSIAN_MONTHS_SHORT[monthIdx]}`;
}

function isoAddDays(isoDate: string, deltaDays: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatDateRU(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}.${d.getFullYear()}`;
}

function isoYmdToRuDmy(iso: string): string {
  const t = iso.trim();
  const head = (t.split("T")[0] ?? t).split(" ")[0] ?? t;
  const p = head.split("-");
  if (p.length !== 3) return "";
  const y = Number(p[0]);
  const mo = Number(p[1]);
  const d = Number(p[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return "";
  return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
}

function parseRuDmyToIsoYmd(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y))
    return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isoYmdToOrdinalDay(iso) > 0 ? iso : null;
}

function normalizeTimeHhMm(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (
    !Number.isFinite(h) ||
    !Number.isFinite(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  )
    return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function ruAdultsChildrenSummary(adults: number, children: number): string {
  const a =
    adults === 1
      ? "1 взрослый"
      : adults >= 2 && adults <= 4
        ? `${adults} взрослых`
        : `${adults} взрослых`;
  const c =
    children === 0
      ? "0 детей"
      : children === 1
        ? "1 ребёнок"
        : children >= 2 && children <= 4
          ? `${children} ребёнка`
          : `${children} детей`;
  return `${a} • ${c}`;
}

function formatBookingRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");

  const sameMonth =
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear();

  if (sameMonth) {
    const dayStart = s.getDate();
    const dayEnd = e.getDate();

    const month = s.toLocaleString("ru-RU", { month: "long" });
    const year = s.getFullYear();

    return `${dayStart} — ${dayEnd} ${month} ${year} г.`;
  }

  const format = (d: Date) =>
    `${d.getDate()} ${d.toLocaleString("ru-RU", { month: "short" })} ${d.getFullYear()}`;

  return `${format(s)} — ${format(e)}`;
}

function formatBookingTableDayTime(
  isoDate: string,
  time: string | null | undefined,
): React.ReactNode {
  const day = formatDay(isoDate);
  const raw = (time ?? "").trim();
  let hm: string | null = null;
  if (raw) {
    const m = raw.match(/^(\d{1,2}):(\d{2})/);
    if (m) hm = `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  return (
    <div className="flex flex-col leading-tight">
      <div className="whitespace-nowrap">{day}</div>
      <div className="whitespace-nowrap text-[10px] text-gray-500">
        {hm != null ? hm : "—"}
      </div>
    </div>
  );
}

function formatBookingTableArrivalDayTime(
  isoDate: string,
  time: string | null | undefined,
): React.ReactNode {
  const raw = (time ?? "").trim();
  const hm = raw ? normalizeTimeHhMm(raw) : "";
  return (
    <div className="leading-tight">
      <div
        className={[
          "whitespace-nowrap text-xs font-medium",
          isTimelineWeekend(isoDate) ? "text-red-600" : "text-sky-700",
        ].join(" ")}
      >
        {formatTimelineDayLabel(isoDate)}
      </div>
      <div className="whitespace-nowrap text-[10px] text-gray-500">
        {hm || "—"}
      </div>
    </div>
  );
}

function bookingTableSourceKey(source: string | undefined): keyof typeof SOURCES {
  if (source != null && source in SOURCES) {
    return source as keyof typeof SOURCES;
  }
  return "manual";
}

function bookingCurrencySymbol(currency: string | undefined): string {
  const c = (currency ?? "RUB").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  return "₽";
}

function bookingDateRangeCompact(b: Booking): string {
  const inD = new Date(b.check_in_date + "T12:00:00");
  const last = new Date(b.check_out_date + "T12:00:00");
  const d1 = inD.getDate();
  const d2 = last.getDate();
  const m1 = inD.getMonth();
  const y1 = inD.getFullYear();
  const m2 = last.getMonth();
  const y2 = last.getFullYear();
  const mo = (idx: number) => RUSSIAN_MONTHS_SHORT[idx];
  if (d1 === d2 && m1 === m2 && y1 === y2) {
    return `${d1} ${mo(m1)}`;
  }
  if (m1 === m2 && y1 === y2) {
    return `${d1}\u2013${d2} ${mo(m1)}`;
  }
  return `${d1} ${mo(m1)} \u2013 ${d2} ${mo(m2)}`;
}

function bookingBlockLine1(b: Booking): string {
  const range = bookingDateRangeCompact(b);
  const raw = b.guest_name?.trim();
  const name = raw ? raw : "Без имени";
  return `${range} · ${name}`;
}

function bookingBlockLine2(b: Booking): string | null {
  const chunks: string[] = [];
  const raw = b.check_in_time?.trim();
  const timeShort = raw
    ? raw.length >= 5 && raw.includes(":")
      ? raw.slice(0, 5)
      : raw
    : null;
  if (timeShort) chunks.push(timeShort);
  if (b.total_price != null) {
    const n = Number(b.total_price);
    if (!Number.isNaN(n)) chunks.push(`${n}${bookingCurrencySymbol(b.currency)}`);
  }
  if (chunks.length === 0) return null;
  return chunks.join(" · ");
}

function bookingComputedOwnerHandAmount(
  totalPrice: number | null | undefined,
  source: string | undefined,
  avitoCommissionPct: string,
): number | null {
  if (totalPrice == null) return null;
  const total = Number(totalPrice);
  if (Number.isNaN(total)) return null;
  const src = source ?? "";
  if (src === "avito") {
    const pct = Number(String(avitoCommissionPct).replace(",", "."));
    const pctN = Number.isNaN(pct) ? 17 : Math.min(100, Math.max(0, pct));
    return total - (total * pctN) / 100;
  }
  return total;
}

function formatPlusRubChessboard(amount: number): string {
  const formatted = amount
    .toLocaleString("ru-RU", { maximumFractionDigits: 20 })
    .replace(/\u00a0/g, " ");
  return `+ ${formatted} ₽`;
}

/** «Мне на руки» в ячейке: сохранённый owner_price или расчёт от total_price. */
function bookingChessboardGuestHandLabel(
  booking: Booking,
  avitoCommissionPct: string,
): string | null {
  if (booking.owner_price != null) {
    const o = Number(booking.owner_price);
    if (!Number.isNaN(o)) return formatPlusRubChessboard(o);
  }
  const computed = bookingComputedOwnerHandAmount(
    booking.total_price,
    booking.source,
    avitoCommissionPct,
  );
  if (computed == null || Number.isNaN(computed)) return null;
  return formatPlusRubChessboard(computed);
}

function parseOwnerHandInput(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function normalizeOwnerPriceForBlurFormat(s: string): string {
  let v = s.replace(/\s/g, "").replace(",", ".");
  const neg = v.startsWith("-");
  if (neg) v = v.slice(1);
  v = v.replace(/[^\d.]/g, "");
  const d = v.indexOf(".");
  if (d !== -1) {
    v = v.slice(0, d + 1) + v.slice(d + 1).replace(/\./g, "");
  }
  return (neg ? "-" : "") + v;
}

function fmtOwnerPriceThousandsForInput(raw: string): string {
  if (raw === "" || raw === "-") return raw;
  const neg = raw.startsWith("-");
  const u = neg ? raw.slice(1) : raw;
  const dot = u.indexOf(".");
  const intPart = dot === -1 ? u : u.slice(0, dot);
  const frac = dot === -1 ? undefined : u.slice(dot + 1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (frac !== undefined) {
    return (neg ? "-" : "") + grouped + "." + frac;
  }
  return (neg ? "-" : "") + grouped;
}

function encodeBookingMessengers(m: {
  contactTg: boolean;
  contactWa: boolean;
  contactMax: boolean;
  contactVk: boolean;
}): string | null {
  const parts: string[] = [];
  if (m.contactTg) parts.push("tg");
  if (m.contactWa) parts.push("wa");
  if (m.contactVk) parts.push("vk");
  if (m.contactMax) parts.push("max");
  return parts.length ? parts.join(",") : null;
}

function decodeBookingMessengers(s: string | null | undefined): {
  contactTg: boolean;
  contactWa: boolean;
  contactMax: boolean;
  contactVk: boolean;
} {
  const set = new Set(
    (s ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    contactTg: set.has("tg"),
    contactWa: set.has("wa"),
    contactMax: set.has("max"),
    contactVk: set.has("vk"),
  };
}

function bookingNightCountForModal(startIso: string, endIso: string): number {
  const a = new Date(startIso + "T12:00:00");
  const b = new Date(endIso + "T12:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function bookingModalStudioSquareClass(studioName: string): string {
  if (studioName === "Маки") return "bg-red-500 ring-1 ring-inset ring-red-800/25";
  if (studioName === "Блюз") return "bg-sky-500 ring-1 ring-inset ring-sky-800/25";
  return "bg-gray-400 ring-1 ring-inset ring-black/10";
}

function formatBookingModalHeaderRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const d1 = s.getDate();
  const d2 = e.getDate();
  const m1 = s.getMonth();
  const m2 = e.getMonth();
  const y1 = s.getFullYear();
  const y2 = e.getFullYear();
  const monthGen = (d: Date) =>
    d
      .toLocaleString("ru-RU", { month: "long" })
      .replace(/^./, (c) => c.toLowerCase());
  if (m1 === m2 && y1 === y2) {
    return `${d1}\u2013${d2} ${monthGen(s)} ${y1}`;
  }
  if (y1 === y2) {
    return `${d1} ${monthGen(s)} \u2013 ${d2} ${monthGen(e)} ${y1}`;
  }
  return `${d1} ${monthGen(s)} ${y1} \u2013 ${d2} ${monthGen(e)} ${y2}`;
}

function bookingModalNightsLabel(n: number): string {
  if (n === 1) return "1 сутки";
  return `${n} суток`;
}

function localTodayKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type DaySemantics = {
  isWeekend: boolean;
  isHoliday: boolean;
  holidayLabel: string | undefined;
  isToday: boolean;
};

function getDaySemantics(day: string, todayKey: string): DaySemantics {
  const dateObj = new Date(day + "T12:00:00");
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const holidayLabel = holidays[day];
  const isHoliday = holidayLabel !== undefined;
  const isToday = day === todayKey;
  return { isWeekend, isHoliday, holidayLabel, isToday };
}

function leftDateCellClasses(sem: DaySemantics): string {
  let s =
    "text-xs flex items-center px-2 sticky left-0 z-[20] border-r border-gray-100 ";
  if (sem.isHoliday) s += "bg-red-50 text-red-600 font-semibold ";
  else if (sem.isWeekend)
    s += "text-blue-600 font-medium bg-blue-50 ";
  else s += "text-gray-500 bg-white ";
  if (sem.isToday) s += "ring-2 ring-green-500 ring-inset rounded-sm ";
  return s;
}

function apartmentColumnIdleClasses(aptName: string): string {
  const bg = apartmentColors[aptName];
  if (bg === "bg-sky-50") return "bg-sky-50 hover:bg-sky-100";
  if (bg === "bg-purple-50") return "bg-purple-50 hover:bg-purple-100";
  return "bg-gray-50 hover:bg-gray-100";
}

function bookingCellClasses(sem: DaySemantics, aptName: string): string {
  const base = "relative isolate h-8 border border-gray-200 ";
  if (sem.isHoliday)
    return (
      base +
      "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-red-50 hover:before:bg-red-100"
    );
  if (sem.isWeekend)
    return (
      base +
      "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-blue-50 hover:before:bg-blue-100"
    );
  return base + apartmentColumnIdleClasses(aptName);
}

/** Ordinal day index (Gregorian), разбор только YYYY-MM-DD, без Date. */
function isoYmdToOrdinalDay(iso: string): number {
  const t = iso.trim();
  const datePart = (t.split("T")[0] ?? t).split(" ")[0] ?? t;
  const parts = datePart.split("-");
  if (parts.length !== 3) return 0;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
  const a = Math.floor((14 - m) / 12);
  const y1 = y + 4800 - a;
  const m1 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m1 + 2) / 5) +
    365 * y1 +
    Math.floor(y1 / 4) -
    Math.floor(y1 / 100) +
    Math.floor(y1 / 400) -
    32045
  );
}

/** День day входит в полуинтервал [checkIn, checkOut) по ординалу (без лексикографии строк). */
function isoYmdInHalfOpenStay(
  day: string,
  checkIn: string,
  checkOut: string,
): boolean {
  const od = isoYmdToOrdinalDay(day);
  const oi = isoYmdToOrdinalDay(checkIn);
  const oo = isoYmdToOrdinalDay(checkOut);
  if (od === 0 || oi === 0 || oo === 0) return false;
  return od >= oi && od < oo;
}

/** Число ночей по сетке: день выезда не входит; минимум 1. */
function bookingCalendarStaySpanDays(checkIn: string, checkOut: string): number {
  const n = isoYmdToOrdinalDay(checkOut) - isoYmdToOrdinalDay(checkIn);
  return Math.max(1, n);
}

/**
 * Один визуальный сегмент брони внутри месяца: первый день диапазона в section.days и длина.
 * Нужно, чтобы полоса не перекрывала строку-заголовок следующего месяца в общей сетке.
 */
function bookingCalendarSegmentInSection(
  booking: Booking,
  sectionDays: string[],
): { firstDay: string; span: number } | null {
  const inSection = sectionDays.filter((d) =>
    isoYmdInHalfOpenStay(d, booking.check_in_date, booking.check_out_date),
  );
  if (inSection.length === 0) return null;
  const full = bookingCalendarStaySpanDays(
    booking.check_in_date,
    booking.check_out_date,
  );
  const span = Math.min(full, inSection.length);
  return { firstDay: inSection[0], span: Math.max(1, span) };
}

function bookingCalendarTimeToMinutes(
  time: string | null | undefined,
): number | null {
  const raw = (time ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/** Доля высоты строки (0–100): откуда начинается полоса в первый день сегмента. */
function bookingCalendarCheckInTopPercent(
  time: string | null | undefined,
): number {
  const mins = bookingCalendarTimeToMinutes(time);
  if (mins == null) return 50;
  if (mins < 8 * 60) return 0;
  if (mins < 12 * 60) return 25;
  if (mins < 16 * 60) return 50;
  return 75;
}

/**
 * Доля высоты строки (0–100): до какой отметки доходит полоса в последний день сегмента
 * (от верха ячейки вниз).
 */
function bookingCalendarCheckOutBottomPercent(
  time: string | null | undefined,
): number {
  const mins = bookingCalendarTimeToMinutes(time);
  if (mins == null) return 100;
  if (mins < 8 * 60) return 25;
  if (mins < 12 * 60) return 50;
  if (mins < 16 * 60) return 75;
  return 100;
}

function bookingCalendarBarVerticalRem(
  booking: Booking,
  span: number,
): { topRem: number; heightRem: number } {
  const topRem =
    (bookingCalendarCheckInTopPercent(booking.check_in_time) / 100) *
    ROW_HEIGHT;
  const bottomRemBase =
    (bookingCalendarCheckOutBottomPercent(booking.check_out_time) / 100) *
    ROW_HEIGHT;
  /** Несколько ночей: последняя строка сегмента — полная высота; доля выезда не укорачивает блок. */
  const bottomRem = span > 1 ? ROW_HEIGHT : bottomRemBase;
  const rawHeight =
    span * ROW_HEIGHT - topRem - (ROW_HEIGHT - bottomRem);
  return {
    topRem,
    heightRem: Math.max(0.25, rawHeight),
  };
}

/** Обводка полосы брони в календаре — чуть темнее заливки источника. */
function bookingCalendarBarBorderClasses(source: string | undefined): string {
  const key =
    source != null && source in SOURCES
      ? (source as keyof typeof SOURCES)
      : "manual";
  const colorClass = SOURCES[key].barBorder;
  return colorClass != null
    ? `border ${colorClass}`
    : "border border-black/20";
}

function calendarBookingBarClasses(booking: Booking): string {
  return (
    bookingCellSourceColorClasses(booking.source) +
    " " +
    bookingCalendarBarBorderClasses(booking.source) +
    " absolute left-0 top-0 z-[22] flex h-auto min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-0 overflow-hidden px-0.5 text-center text-[10px] leading-tight text-gray-900 shadow-sm "
  );
}

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

function formatPrice(n: number) {
  return n.toLocaleString("ru-RU");
}

function SourceCard({
  source,
  onEnabledChange,
  onNameChange,
}: {
  source: Source;
  onEnabledChange: (id: string, enabled: boolean) => void;
  onNameChange: (id: string, name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`h-9 w-9 shrink-0 rounded-lg border border-gray-200 ${source.color}`}
          title="Цвет в календаре"
          aria-hidden
        />
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          value={source.name}
          onChange={(e) => onNameChange(source.id, e.target.value)}
          aria-label="Название источника"
        />
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={source.enabled}
          onChange={(e) => onEnabledChange(source.id, e.target.checked)}
        />
        <span>Включён</span>
      </label>
    </div>
  );
}

export default function App() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES);
  const [bookingsViewMode, setBookingsViewMode] =
    useState<BookingsViewMode>("table");
  const [bookingsSourceFilterIds, setBookingsSourceFilterIds] = useState<
    BookingSourceKey[]
  >([]);
  const [bookingsStudioFilterIds, setBookingsStudioFilterIds] = useState<
    number[]
  >([]);
  const [timelineMonthOpen, setTimelineMonthOpen] = useState<
    Record<string, boolean>
  >({});
  const [activeSourceId, setActiveSourceId] = useState<string>(
    INITIAL_SOURCES[0].id,
  );
  // TEMP: sync sources with INITIAL_SOURCES for dev
  useEffect(() => {
    setSources(INITIAL_SOURCES);
  }, []);

  useEffect(() => {
    if (!sources.some((s) => s.id === activeSourceId)) {
      setActiveSourceId(sources[0]?.id ?? INITIAL_SOURCES[0].id);
    }
  }, [sources, activeSourceId]);

  const activeSource =
    sources.find((s) => s.id === activeSourceId) ?? sources[0];

  const [priceMap, setPriceMap] = useState<
    Record<number, Record<string, { price: number | null; is_blocked: boolean }>>
  >({});

  const [activeTab, setActiveTab] = useState<
    | "calendar"
    | "apartments"
    | "events"
    | "bookings"
    | "sources"
    | "priceCalendar"
  >("calendar");

  const [enabledEvents, setEnabledEvents] = useState<Record<string, boolean>>(
    {},
  );

  const [popup, setPopup] = useState<{
    date: string;
    x: number;
    y: number;
  } | null>(null);

  const [selection, setSelection] = useState<{
    apartmentId: number;
    start: string;
    end: string;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    day: string;
    apartmentId: number;
    isBooked: boolean;
    rangeActions?: boolean;
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    apartmentId: number;
    start: string;
    end: string;
  } | null>(null);

  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>(
    { x: 0, y: 0 },
  );

  const [priceInput, setPriceInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const [bookingModal, setBookingModal] = useState<{
    apartmentId: number;
    start: string;
    end: string;
    bookingId?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    guest_name: "",
    total_price: "",
    owner_price: "",
    check_in_time: "",
    check_out_time: "",
    notes: "",
    source: "manual",
  });

  const [bookingModalMain, setBookingModalMain] = useState({
    dmyStart: "",
    dmyEnd: "",
    adults: 1,
    children: 0,
    phone: "",
    contactTg: false,
    contactMax: false,
    contactWa: false,
    contactVk: false,
  });

  const [ownerHandDirty, setOwnerHandDirty] = useState(false);
  const [guestPriceDirty, setGuestPriceDirty] = useState(false);
  const savedOwnerWasNullRef = useRef(true);

  const [bookingFinanceExtra, setBookingFinanceExtra] = useState({
    commissionRub: "",
    commissionPct: "17",
    paidRub: "",
    paidDateDmy: "",
    paymentMethod: "cash" as "cash" | "alpha",
  });

  const [sortField, setSortField] = useState<string>("check_in_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [bookingsColumnWidths, setBookingsColumnWidths] = useState({
    guest: 280,
    price: 112,
    ownerPrice: 112,
    comment: 360,
  });

  // Note:
  // "guest" is resizable; width comes from state from the start.
  // "comment" starts flexible (w-full) and becomes fixed after the first resize.
  // "price" / "ownerPrice" use state width only; they are not resizable.
  const [bookingsColManual, setBookingsColManual] = useState<
    Record<BookingsResizableKey, boolean>
  >({ guest: true, comment: false });

  const [bookingsColumnResize, setBookingsColumnResize] = useState<{
    key: BookingsResizableKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [avitoSurchargeDigits, setAvitoSurchargeDigits] = useState({
    cleaning: "",
    adult: "",
    child: "",
    pet: "",
  });
  const [avitoDiscountRows, setAvitoDiscountRows] = useState<
    { id: string; nights: string; percent: string }[]
  >([]);
  const [avitoCommissionPct, setAvitoCommissionPct] = useState("17");

  const popupRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const calendarAreaRef = useRef<HTMLDivElement | null>(null);
  const chessBoardPriceModalRef = useRef<HTMLDivElement | null>(null);
  const sourceSettingsLoadedRef = useRef(false);
  const bookingDateStartRef = useRef<HTMLInputElement | null>(null);
  const bookingDateEndRef = useRef<HTMLInputElement | null>(null);
  const bookingPaymentDateRef = useRef<HTMLInputElement | null>(null);
  const bookingGuestNameRef = useRef<HTMLInputElement | null>(null);
  const bookingModalSaveRef = useRef<HTMLButtonElement | null>(null);

  async function saveActiveSourceSettings() {
    let settings: Record<string, unknown> = {};
    if (activeSourceId === "avito") {
      settings = {
        surcharges: { ...avitoSurchargeDigits },
        discountRows: avitoDiscountRows,
        commissionPct: avitoCommissionPct,
      };
    }
    const res = await fetch(
      `${API_BASE}/api/source-settings/${encodeURIComponent(activeSourceId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      },
    );
    if (!res.ok) alert("Не удалось сохранить настройки");
  }

  function bookingGuestTotalFromCalendarRange(
    apartmentId: number,
    start: string,
    endExclusive: string,
  ): number {
    let total = 0;
    let d = start;
    while (d < endExclusive) {
      const p = priceMap[apartmentId]?.[d]?.price;
      if (p != null) {
        const n = Number(p);
        if (Number.isFinite(n)) total += n;
      }
      d = isoAddDays(d, 1);
    }
    return Math.max(0, Math.round(total));
  }

  function openBookingModalForCreateRange(
    apartmentId: number,
    start: string,
    lastStay: string,
  ) {
    const endExclusive = isoAddDays(lastStay, 1);
    const guestTotal = bookingGuestTotalFromCalendarRange(
      apartmentId,
      start,
      endExclusive,
    );
    setGuestPriceDirty(false);
    setOwnerHandDirty(false);
    savedOwnerWasNullRef.current = true;
    setBookingModal({
      apartmentId,
      start,
      end: endExclusive,
      bookingId: undefined,
    });
    setFormData({
      guest_name: "",
      total_price: String(guestTotal),
      owner_price: "",
      check_in_time: "",
      check_out_time: "",
      notes: "",
      source: "manual",
    });
    setBookingModalMain((p) => ({
      ...p,
      adults: 1,
      children: 0,
      phone: "",
      contactTg: false,
      contactMax: false,
      contactWa: false,
      contactVk: false,
    }));
    setContextMenu(null);
  }

  function openBookingModalFromSelection(apartmentId: number) {
    if (!selection) return;
    if (selection.apartmentId !== apartmentId) return;
    const start =
      selection.start < selection.end ? selection.start : selection.end;
    const lastStay =
      selection.start > selection.end ? selection.start : selection.end;
    openBookingModalForCreateRange(apartmentId, start, lastStay);
  }

  function openBookingModalForEdit(b: Booking) {
    setBookingModal({
      bookingId: b.id,
      apartmentId: b.apartment_id,
      start: b.check_in_date,
      end: b.check_out_date,
    });
    const handStrForOpen =
      b.owner_price != null
        ? String(b.owner_price)
        : (() => {
            const c = bookingComputedOwnerHandAmount(
              b.total_price,
              b.source,
              avitoCommissionPct,
            );
            return c != null ? String(c) : "";
          })();
    savedOwnerWasNullRef.current = b.owner_price == null;
    setGuestPriceDirty(true);
    setOwnerHandDirty(false);
    setFormData({
      guest_name: b.guest_name ?? "",
      total_price: b.total_price != null ? String(b.total_price) : "",
      owner_price: handStrForOpen,
      check_in_time: b.check_in_time ?? "",
      check_out_time: b.check_out_time ?? "",
      notes: b.notes ?? "",
      source:
        b.source != null && b.source in SOURCES
          ? b.source
          : "manual",
    });
    const totN = Number(b.total_price ?? 0);
    const pDefault = Math.min(
      100,
      Math.max(0, Number((avitoCommissionPct || "17").trim()) || 17),
    );
    const crDefault =
      totN > 0 && Number.isFinite(totN)
        ? Math.round((totN * pDefault) / 100)
        : 0;
    setBookingFinanceExtra({
      commissionRub:
        b.commission_price != null && Number.isFinite(Number(b.commission_price))
          ? fmtOwnerPriceThousandsForInput(
              String(Math.round(Number(b.commission_price))),
            )
          : crDefault > 0
            ? fmtOwnerPriceThousandsForInput(String(crDefault))
            : "",
      commissionPct:
        b.commission_percent != null &&
        Number.isFinite(Number(b.commission_percent))
          ? String(Math.round(Number(b.commission_percent)))
          : String(Math.round(pDefault)),
      paidRub:
        b.paid_amount != null && Number.isFinite(Number(b.paid_amount))
          ? fmtOwnerPriceThousandsForInput(
              String(Math.round(Number(b.paid_amount))),
            )
          : "",
      paidDateDmy:
        b.paid_date != null && String(b.paid_date).trim()
          ? isoYmdToRuDmy(String(b.paid_date).trim().slice(0, 10))
          : "",
      paymentMethod: b.payment_method === "alpha" ? "alpha" : "cash",
    });
    const msg = decodeBookingMessengers(b.messengers);
    setBookingModalMain((p) => ({
      ...p,
      adults: Math.max(1, b.guests_count ?? 1),
      children: 0,
      phone: b.guest_contact ?? "",
      contactTg: msg.contactTg,
      contactMax: msg.contactMax,
      contactWa: msg.contactWa,
      contactVk: msg.contactVk,
    }));
    setSelection(null);
    setContextMenu(null);
  }

  useEffect(() => {
    if (!bookingModal) return;
    setBookingModalMain((p) => ({
      ...p,
      dmyStart: isoYmdToRuDmy(bookingModal.start),
      dmyEnd: isoYmdToRuDmy(bookingModal.end),
    }));
  }, [bookingModal?.start, bookingModal?.end]);

  useEffect(() => {
    if (!bookingModal) return;
    if (bookingModal.bookingId != null) return;
    const tot = parseOwnerHandInput(formData.total_price) ?? 0;
    const p = Math.min(
      100,
      Math.max(0, Number((avitoCommissionPct || "17").trim()) || 17),
    );
    const cr = tot > 0 ? Math.round((tot * p) / 100) : 0;
    setBookingFinanceExtra({
      commissionRub:
        cr > 0 ? fmtOwnerPriceThousandsForInput(String(cr)) : "",
      commissionPct: String(Math.round(p)),
      paidRub: "",
      paidDateDmy: "",
      paymentMethod: "cash",
    });
  }, [bookingModal?.apartmentId, bookingModal?.start, bookingModal?.end]);

  useEffect(() => {
    if (!bookingModal) return;
    if (ownerHandDirty) return;
    if (bookingModal.bookingId != null && !savedOwnerWasNullRef.current) return;
    setFormData((p) => {
      const t = parseOwnerHandInput(p.total_price);
      const hand = bookingComputedOwnerHandAmount(
        t != null && Number.isFinite(t) ? t : null,
        p.source,
        avitoCommissionPct,
      );
      const next = hand != null ? String(hand) : "";
      if (p.owner_price === next) return p;
      return { ...p, owner_price: next };
    });
  }, [
    bookingModal,
    formData.total_price,
    formData.source,
    avitoCommissionPct,
    ownerHandDirty,
  ]);

  useEffect(() => {
    if (!bookingModal) return;
    if (bookingModal.bookingId != null) return;
    if (guestPriceDirty) return;
    const total = bookingGuestTotalFromCalendarRange(
      bookingModal.apartmentId,
      bookingModal.start,
      bookingModal.end,
    );
    const next = String(total);
    setFormData((p) => {
      if (p.total_price === next) return p;
      return { ...p, total_price: next };
    });
  }, [
    bookingModal?.apartmentId,
    bookingModal?.start,
    bookingModal?.end,
    bookingModal?.bookingId,
    guestPriceDirty,
    priceMap,
  ]);

  useEffect(() => {
    if (!editModal) return;
    const entry = priceMap[editModal.apartmentId]?.[editModal.start];
    setIsOpen(entry?.is_blocked !== true);
    setPriceInput(entry?.price != null ? String(entry.price) : "");
    setCommentInput("");
  }, [editModal, priceMap]);

  useEffect(() => {
    if (!editModal || !chessBoardPriceModalRef.current) return;

    const rect = chessBoardPriceModalRef.current.getBoundingClientRect();

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

  useEffect(() => {
    if (!bookingModal) return;
    const tid = window.setTimeout(() => {
      bookingGuestNameRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(tid);
  }, [
    bookingModal?.bookingId,
    bookingModal?.apartmentId,
    bookingModal?.start,
    bookingModal?.end,
  ]);

  useEffect(() => {
    if (!bookingModal && !editModal) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (bookingModal) {
          setBookingModal(null);
          return;
        }
        if (editModal) {
          setEditModal(null);
        }
        return;
      }
      if (e.key === "Enter" && bookingModal) {
        const t = e.target as HTMLElement;
        if (
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.tagName === "BUTTON" ||
          t.tagName === "A" ||
          t.tagName === "SUMMARY"
        ) {
          return;
        }
        e.preventDefault();
        bookingModalSaveRef.current?.click();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [bookingModal, editModal]);

  useEffect(() => {
    if (!editModal) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (chessBoardPriceModalRef.current?.contains(t)) return;
      if (contextMenuRef.current?.contains(t)) return;
      setEditModal(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [editModal]);

  async function handleSave() {
    if (!editModal) return;

    const raw = priceInput.replace(/[^\d]/g, "");
    const num = Number(raw);

    if (isOpen && (!raw || Number.isNaN(num))) {
      alert("Укажите цену");
      return;
    }

    const body = {
      apartment_id: editModal.apartmentId,
      start_date: editModal.start,
      end_date: editModal.end,
      price: isOpen ? num : null,
      is_blocked: !isOpen,
      comment: commentInput.trim() || null,
    };

    const res = await fetch(`${API_BASE}/api/price-calendar/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      alert("Ошибка сохранения");
      return;
    }

    const rows = (await res.json()) as Array<{
      date: string;
      price: number | null;
      is_blocked: boolean;
    }>;

    setPriceMap((prev) => {
      const next = { ...prev };
      const aid = editModal.apartmentId;
      if (!next[aid]) next[aid] = {};
      const inner = { ...next[aid] };
      for (const r of rows) {
        const d = String(r.date).slice(0, 10);
        inner[d] = {
          price: r.price,
          is_blocked: r.is_blocked,
        };
      }
      next[aid] = inner;
      return next;
    });

    setEditModal(null);
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach((e) => {
      if (enabledEvents[e.id] === false) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [enabledEvents]);

  const eventsGrouped = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, []);

  const calendarMonths = useMemo(() => buildMonthSections(12), []);

  const priceCalendarFetchBounds = useMemo(() => {
    if (calendarMonths.length === 0) return null;
    const start_date = calendarMonths[0].days[0];
    const lastMonth = calendarMonths[calendarMonths.length - 1];
    const end_date = lastMonth.days[lastMonth.days.length - 1];
    return { start_date, end_date };
  }, [calendarMonths]);

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    () => {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return { [key]: true };
    },
  );

  function toggleMonth(monthKey: string) {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  }

  function openBookingModalById(bookingId: number) {
    const b = bookings?.find((x) => x.id === bookingId);
    if (!b) return;
    openBookingModalForEdit(b);
  }

  function isMonthExpanded(monthKey: string) {
    return expandedMonths[monthKey] === true;
  }

  function isInSelection(day: string, aptId: number) {
    if (!selection || selection.apartmentId !== aptId) return false;

    const d = new Date(day + "T12:00:00");
    const s = new Date(selection.start + "T12:00:00");
    const e = new Date(selection.end + "T12:00:00");

    const start = s < e ? s : e;
    const end = s > e ? s : e;

    return d >= start && d <= end;
  }

  function toggleBookingsSourceFilter(id: BookingSourceKey) {
    setBookingsSourceFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleBookingsStudioFilter(id: number) {
    setBookingsStudioFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const bookingsFilteredByLocalSources = useMemo(() => {
    if (!bookings) return null;
    if (bookingsSourceFilterIds.length === 0) return bookings;
    const selected = new Set(bookingsSourceFilterIds);
    return bookings.filter((b) => selected.has(bookingTableSourceKey(b.source)));
  }, [bookings, bookingsSourceFilterIds]);

  const bookingsFilteredByLocalFilters = useMemo(() => {
    if (!bookingsFilteredByLocalSources) return null;
    if (bookingsStudioFilterIds.length === 0) return bookingsFilteredByLocalSources;
    const selectedStudios = new Set(bookingsStudioFilterIds);
    return bookingsFilteredByLocalSources.filter((b) =>
      selectedStudios.has(b.apartment_id),
    );
  }, [bookingsFilteredByLocalSources, bookingsStudioFilterIds]);

  const sortedBookings = useMemo(() => {
    if (!bookingsFilteredByLocalFilters) return null;
    const aptName = (id: number) =>
      apartments?.find((x) => x.id === id)?.name ?? String(id);
    const list = [...bookingsFilteredByLocalFilters];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "check_in_date":
          cmp = a.check_in_date.localeCompare(b.check_in_date);
          break;
        case "check_out_date":
          cmp = a.check_out_date.localeCompare(b.check_out_date);
          break;
        case "apartment":
          cmp = aptName(a.apartment_id).localeCompare(aptName(b.apartment_id));
          break;
        case "guest_name":
          cmp = (a.guest_name ?? "").localeCompare(b.guest_name ?? "");
          break;
        case "total_price":
          cmp = (a.total_price ?? 0) - (b.total_price ?? 0);
          break;
        case "guests_count":
          cmp = (a.guests_count ?? 0) - (b.guests_count ?? 0);
          break;
        case "owner_price":
          cmp = (a.owner_price ?? 0) - (b.owner_price ?? 0);
          break;
        case "source":
          cmp = (a.source ?? "").localeCompare(b.source ?? "");
          break;
        case "comment":
          cmp = (a.notes ?? "").localeCompare(b.notes ?? "");
          break;
        default:
          cmp = a.check_in_date.localeCompare(b.check_in_date);
      }
      if (sortDirection === "desc") cmp = -cmp;
      if (cmp === 0) cmp = a.id - b.id;
      return cmp;
    });
    return list;
  }, [bookingsFilteredByLocalFilters, apartments, sortField, sortDirection]);

  const calendarVisibleBookings = useMemo(() => {
    if (!bookings) return null;
    return bookings.filter((b) => {
      if (b.source === undefined) return true;
      const s = sources.find((x) => x.id === b.source);
      return s !== undefined && s.enabled;
    });
  }, [bookings, sources]);

  useEffect(() => {
    if (activeTab !== "sources") return;
    if (sourceSettingsLoadedRef.current) return;
    sourceSettingsLoadedRef.current = true;

    fetch(`${API_BASE}/api/source-settings`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: { source_id: string; settings: Record<string, unknown> }[]) => {
        for (const row of rows) {
          if (row.source_id !== "avito") continue;
          const s = row.settings;
          if (!s || typeof s !== "object") continue;
          const sur = (s as { surcharges?: unknown }).surcharges;
          if (sur && typeof sur === "object") {
            const u = sur as Record<string, unknown>;
            setAvitoSurchargeDigits({
              cleaning:
                typeof u.cleaning === "string" ? digitsOnlyRub(u.cleaning) : "",
              adult: typeof u.adult === "string" ? digitsOnlyRub(u.adult) : "",
              child: typeof u.child === "string" ? digitsOnlyRub(u.child) : "",
              pet: typeof u.pet === "string" ? digitsOnlyRub(u.pet) : "",
            });
          }
          const dr = (s as { discountRows?: unknown }).discountRows;
          if (Array.isArray(dr)) {
            setAvitoDiscountRows(
              dr
                .filter(
                  (x): x is Record<string, unknown> =>
                    x != null && typeof x === "object",
                )
                .map((x, i) => ({
                  id:
                    typeof x.id === "string" && x.id.length > 0
                      ? x.id
                      : `d-${i}-${Date.now()}`,
                  nights:
                    typeof x.nights === "string" ? digitsOnlyRub(x.nights) : "",
                  percent:
                    typeof x.percent === "string"
                      ? x.percent.replace(/[^\d.,]/g, "").replace(",", ".")
                      : "",
                })),
            );
          }
          if ("commissionPct" in s) {
            const cp = (s as { commissionPct?: unknown }).commissionPct;
            setAvitoCommissionPct(
              typeof cp === "string" && cp.length > 0 ? cp : "17",
            );
          }
        }
      })
      .catch(() => {});
  }, [activeTab]);

  function handleBookingsSort(field: string) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function sortHeaderArrow(field: string) {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  useEffect(() => {
    if (!bookingsColumnResize) return undefined;
    const { key, startX, startWidth } = bookingsColumnResize;
    const min = BOOKINGS_COL_MIN[key];

    function onMove(e: MouseEvent) {
      e.preventDefault();
      const w = Math.max(min, startWidth + e.clientX - startX);
      setBookingsColumnWidths((prev) => ({ ...prev, [key]: w }));
    }

    function onUp() {
      setBookingsColumnResize(null);
    }

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [bookingsColumnResize]);

  function beginBookingsColResize(
    e: React.MouseEvent,
    key: BookingsResizableKey,
    width: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    let startWidth = width;
    if (key === "comment" && !bookingsColManual.comment) {
      const th = (e.currentTarget as HTMLElement).closest("th");
      startWidth = Math.max(
        BOOKINGS_COL_MIN.comment,
        Math.round(th?.getBoundingClientRect().width ?? width),
      );
      setBookingsColManual((p) => ({ ...p, comment: true }));
      setBookingsColumnWidths((prev) => ({ ...prev, comment: startWidth }));
    }
    setBookingsColumnResize({ key, startX: e.clientX, startWidth });
  }

  useEffect(() => {
    fetch("http://localhost:8000/api/apartments/")
      .then((res) => res.json())
      .then(setApartments)
      .catch(() => setApartments([]));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/api/bookings/")
      .then((res) => res.json())
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    if (activeTab !== "calendar") return;
    if (!apartments || apartments.length === 0 || !priceCalendarFetchBounds) {
      setPriceMap({});
      return;
    }
    const { start_date, end_date } = priceCalendarFetchBounds;
    type PriceRow = {
      date: string;
      price: number | null;
      is_blocked: boolean;
    };
    Promise.all(
      apartments.map((apt) => {
        const url = new URL("http://localhost:8000/api/price-calendar/");
        url.searchParams.set("apartment_id", String(apt.id));
        url.searchParams.set("start_date", start_date);
        url.searchParams.set("end_date", end_date);
        return fetch(url.toString()).then((res) =>
          res.ok ? (res.json() as Promise<PriceRow[]>) : Promise.resolve([]),
        );
      }),
    )
      .then((perApt) => {
        const next: Record<
          number,
          Record<string, { price: number | null; is_blocked: boolean }>
        > = {};
        apartments.forEach((apt, i) => {
          next[apt.id] = {};
          for (const row of perApt[i]) {
            const dateKey = String(row.date).slice(0, 10);
            next[apt.id][dateKey] = {
              price: row.price,
              is_blocked: row.is_blocked,
            };
          }
        });
        setPriceMap(next);
      })
      .catch(() => setPriceMap({}));
  }, [activeTab, apartments, priceCalendarFetchBounds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setPopup(null);
      }
    }

    if (popup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popup]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    }

    if (contextMenu) {
      document.addEventListener("mousedown", handleOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    function handleDocMouseDown(event: MouseEvent) {
      if (bookingModal) return;
      const t = event.target as Node;
      if (calendarAreaRef.current?.contains(t)) return;
      if (chessBoardPriceModalRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      if (contextMenuRef.current?.contains(t)) return;
      setSelection(null);
    }

    document.addEventListener("mousedown", handleDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocMouseDown);
    };
  }, [bookingModal, editModal]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    fetch("http://localhost:8000/api/apartments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, address }),
    })
      .then((res) => res.json())
      .then((created) => {
        setApartments((prev) => (prev ? [...prev, created] : [created]));
        setName("");
        setAddress("");
      });
  }

  function handleDelete(id: number) {
    if (!window.confirm("Delete this apartment?")) return;

    fetch(`http://localhost:8000/api/apartments/${id}/`, {
      method: "DELETE",
    }).then(() => {
      setApartments((prev) =>
        prev ? prev.filter((a) => a.id !== id) : prev,
      );
    });
  }

  function handleStartEdit(a: Apartment) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditAddress(a.address ?? "");
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;

    fetch(`http://localhost:8000/api/apartments/${editingId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        address: editAddress,
      }),
    })
      .then((res) => res.json())
      .then((updated) => {
        setApartments((prev) =>
          prev?.map((a) => (a.id === updated.id ? updated : a)) ?? prev,
        );
        setEditingId(null);
      });
  }

  function handleQuickBooking(apartmentId: number, day: string) {
    const checkIn = day;
    const next = new Date(day + "T12:00:00");
    next.setDate(next.getDate() + 1);
    const checkOut = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;

    fetch("http://localhost:8000/api/bookings/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apartment_id: apartmentId,
        guest_name: "Guest",
        check_in_date: checkIn,
        check_out_date: checkOut,
        total_price: 0,
        currency: "RUB",
        source: "manual",
      }),
    })
      .then((res) => res.json())
      .then((newBooking: Booking) => {
        setBookings((prev) =>
          prev ? [...prev, newBooking] : [newBooking],
        );
      })
      .catch(console.error);
  }

  const timelineMonthGroups = useMemo(() => {
    if (!bookingsFilteredByLocalFilters || bookingsFilteredByLocalFilters.length === 0)
      return [] as {
        monthKey: string;
        monthLabel: string;
        bookingsCount: number;
        occupancySummary: string;
        monthIncomeLabel: string;
        avgOccupiedLabel: string;
        avgCalendarLabel: string;
        monthIncome: number;
        occupancyByApartment: { apartmentName: string; nights: number }[];
        days: TimelineArrivalItem[];
      }[];

    const arrivals = bookingsFilteredByLocalFilters
      .map((b) => {
        const day = (b.check_in_date ?? "").slice(0, 10);
        if (!day) return null;
        const apartmentName =
          apartments?.find((a) => a.id === b.apartment_id)?.name ??
          String(b.apartment_id);
        const sourceKey = bookingTableSourceKey(b.source);
        const sourceLabel = SOURCES[sourceKey].label;
        const guestName = b.guest_name?.trim() ? b.guest_name : "—";
        return {
          id: b.id,
          monthKey: day.slice(0, 7),
          day,
          apartmentSortKey: apartmentName,
          nights: timelineNightsCount(b.check_in_date, b.check_out_date),
          apartmentName,
          guestName,
          sourceLabel,
          apartmentDotClass: timelineApartmentDotClass(apartmentName),
          checkInTimeLabel: formatCheckInTimeCompact(b.check_in_time),
          guestLine: `${guestName} · ${formatGuestsCountRu(b.guests_count)}`,
          sourceBadgeClass: SOURCES[sourceKey].color,
          nightsLabel: formatTimelineNights(b.check_in_date, b.check_out_date),
          checkoutLabel: formatCheckoutCompact(b.check_out_date, b.check_out_time),
          ownerIncome: b.owner_price != null && Number.isFinite(Number(b.owner_price)) ? Number(b.owner_price) : 0,
          payoutLabel: formatTimelinePayout(b.owner_price),
          payoutHasValue: b.owner_price != null && !Number.isNaN(b.owner_price),
        };
      })
      .filter(
        (
          v,
        ): v is {
          id: number;
          monthKey: string;
          day: string;
          apartmentSortKey: string;
          apartmentName: string;
          guestName: string;
          apartmentDotClass: string;
          checkInTimeLabel: string;
          guestLine: string;
          sourceLabel: string;
          sourceBadgeClass: string;
          nightsLabel: string;
          checkoutLabel: string;
          payoutLabel: string;
          ownerIncome: number;
          payoutHasValue: boolean;
          nights: number;
        } => v !== null,
      )
      .sort((a, b) => {
        if (a.monthKey !== b.monthKey) return a.monthKey.localeCompare(b.monthKey);
        if (a.day !== b.day) return a.day.localeCompare(b.day);
        if (a.apartmentSortKey !== b.apartmentSortKey) {
          return a.apartmentSortKey.localeCompare(b.apartmentSortKey, "ru");
        }
        return a.id - b.id;
      });

    const byMonth = new Map<
      string,
      Map<
        string,
        {
          id: number;
          apartmentSortKey: string;
          apartmentName: string;
          guestLine: string;
          sourceLabel: string;
          apartmentDotClass: string;
          checkInTimeLabel: string;
          sourceBadgeClass: string;
          nightsLabel: string;
          checkoutLabel: string;
          payoutLabel: string;
          payoutHasValue: boolean;
        }[]
      >
    >();
    const byMonthApartmentNights = new Map<string, Map<string, number>>();
    const byMonthBookingCount = new Map<string, number>();
    const byMonthOwnerIncome = new Map<string, number>();
    const byMonthOccupiedNights = new Map<string, number>();
    for (const item of arrivals) {
      if (!byMonth.has(item.monthKey)) byMonth.set(item.monthKey, new Map());
      const byDay = byMonth.get(item.monthKey)!;
      if (!byDay.has(item.day)) byDay.set(item.day, []);
      byDay
        .get(item.day)!
        .push({
          id: item.id,
          apartmentName: item.apartmentName,
          guestLine: item.guestLine,
          sourceLabel: item.sourceLabel,
          apartmentDotClass: item.apartmentDotClass,
          checkInTimeLabel: item.checkInTimeLabel,
          sourceBadgeClass: item.sourceBadgeClass,
          nightsLabel: item.nightsLabel,
          checkoutLabel: item.checkoutLabel,
          payoutLabel: item.payoutLabel,
          payoutHasValue: item.payoutHasValue,
          apartmentSortKey: item.apartmentSortKey,
        });
      if (!byMonthApartmentNights.has(item.monthKey)) {
        byMonthApartmentNights.set(item.monthKey, new Map());
      }
      const aptNights = byMonthApartmentNights.get(item.monthKey)!;
      aptNights.set(
        item.apartmentSortKey,
        (aptNights.get(item.apartmentSortKey) ?? 0) + item.nights,
      );
      byMonthBookingCount.set(
        item.monthKey,
        (byMonthBookingCount.get(item.monthKey) ?? 0) + 1,
      );
      byMonthOwnerIncome.set(
        item.monthKey,
        (byMonthOwnerIncome.get(item.monthKey) ?? 0) + item.ownerIncome,
      );
      byMonthOccupiedNights.set(
        item.monthKey,
        (byMonthOccupiedNights.get(item.monthKey) ?? 0) + item.nights,
      );
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, dayMap]) => ({
        monthKey,
        monthLabel: capitalizeFirst(
          new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("ru-RU", {
            month: "long",
            year: "numeric",
          }),
        ),
        monthIncome: byMonthOwnerIncome.get(monthKey) ?? 0,
        monthIncomeLabel: formatTimelinePayout(
          byMonthOwnerIncome.get(monthKey) ?? 0,
        ),
        avgOccupiedLabel:
          (byMonthOccupiedNights.get(monthKey) ?? 0) > 0
            ? `${formatRubMoney((byMonthOwnerIncome.get(monthKey) ?? 0) / (byMonthOccupiedNights.get(monthKey) ?? 1))} зан.`
            : "— зан.",
        avgCalendarLabel: (() => {
          const daysInMonth = new Date(`${monthKey}-01T12:00:00`).getMonth() === 11
            ? 31
            : new Date(new Date(`${monthKey}-01T12:00:00`).getFullYear(), new Date(`${monthKey}-01T12:00:00`).getMonth() + 1, 0).getDate();
          const studiosCount = apartments?.length ?? 0;
          return daysInMonth * studiosCount > 0 ? `${formatRubMoney((byMonthOwnerIncome.get(monthKey) ?? 0) / (daysInMonth * studiosCount))} кал.` : "— кал.";
        })(),
        bookingsCount: byMonthBookingCount.get(monthKey) ?? 0,
        occupancyByApartment: Array.from(
          (byMonthApartmentNights.get(monthKey) ?? new Map()).entries(),
        )
          .sort(([a], [b]) => a.localeCompare(b, "ru"))
          .map(([apartmentName, nights]) => ({ apartmentName, nights })),
        occupancySummary: Array.from(
          (byMonthApartmentNights.get(monthKey) ?? new Map()).entries(),
        )
          .sort(([a], [b]) => a.localeCompare(b, "ru"))
          .map(([apartmentName, nights]) => `${apartmentName} ${nights}с`)
          .join(" • "),
        days: Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, items]) => ({
            day,
            items: [...items].sort((a, b) =>
              a.apartmentSortKey.localeCompare(b.apartmentSortKey, "ru"),
            ),
          })),
      }));
  }, [bookingsFilteredByLocalFilters, apartments]);

  useEffect(() => {
    const currentMonthKey = localTodayKey().slice(0, 7);
    setTimelineMonthOpen((prev) => {
      const next: Record<string, boolean> = {};
      for (const monthGroup of timelineMonthGroups) {
        if (monthGroup.monthKey in prev) {
          next[monthGroup.monthKey] = prev[monthGroup.monthKey];
        } else {
          next[monthGroup.monthKey] = monthGroup.monthKey >= currentMonthKey;
        }
      }
      return next;
    });
  }, [timelineMonthGroups]);

  function toggleTimelineMonth(monthKey: string) {
    setTimelineMonthOpen((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  }

  const calendarTodayKey = localTodayKey();

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-gray-200">
      <div className="w-48 shrink-0 bg-white border-r p-4 space-y-2">
        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "calendar" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("calendar")}
        >
          Шахматка
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "bookings" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("bookings")}
        >
          Бронирования
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "priceCalendar" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("priceCalendar")}
        >
          Календарь цен
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "sources" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("sources")}
        >
          Источники
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "events" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("events")}
        >
          События
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "apartments" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("apartments")}
        >
          Апартаменты
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6">
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          {activeTab === "calendar" && (
            <>
              {bookings === null ? (
                <p>Loading...</p>
              ) : (
                apartments &&
                bookings && (
                  <div
                    ref={calendarAreaRef}
                    className="relative flex-1 min-h-0 flex flex-col w-full"
                  >
                  <div className="bg-white rounded-xl shadow p-4 flex-1 min-h-[12rem] min-w-0 flex flex-col max-h-[calc(100vh-10rem)]">
                    <div className="overflow-auto flex-1 min-h-0 -mx-1 px-1">
                      <div
                        className="grid gap-x-2 gap-y-0 text-sm min-w-max"
                        style={{
                          gridTemplateColumns: `120px repeat(${apartments.length}, minmax(72px, 1fr))`,
                        }}
                      >
                        <div className="sticky left-0 top-0 z-[26] bg-gray-50 border-b border-gray-200" />
                        {apartments.map((apt) => (
                          <div
                            key={apt.id}
                            className={
                              "sticky top-0 z-[24] text-center text-xs text-gray-500 font-medium py-1 border-b border-gray-200 " +
                              (apartmentColors[apt.name] ?? "bg-gray-50")
                            }
                          >
                            {apt.name}
                          </div>
                        ))}

                        {calendarMonths.map((section) => (
                          <React.Fragment key={section.month}>
                            <button
                              type="button"
                              className="text-left font-semibold text-sm py-2 px-2 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors border-y border-gray-200 -mx-px"
                              style={{ gridColumn: "1 / -1" }}
                              onClick={() => toggleMonth(section.month)}
                              aria-expanded={isMonthExpanded(section.month)}
                            >
                              {section.label}
                              <span className="ml-2 text-gray-500 font-normal">
                                {isMonthExpanded(section.month) ? "▼" : "▶"}
                              </span>
                            </button>

                            {isMonthExpanded(section.month) &&
                              section.days.map((day) => {
                                const sem = getDaySemantics(
                                  day,
                                  calendarTodayKey,
                                );

                                return (
                                  <div
                                    key={day}
                                    className="box-border grid gap-x-2 border-b border-gray-200"
                                    style={{
                                      gridColumn: "1 / -1",
                                      gridTemplateColumns: `120px repeat(${apartments.length}, minmax(72px, 1fr))`,
                                    }}
                                  >
                                    <div
                                      className={
                                        leftDateCellClasses(sem) +
                                        " cursor-pointer min-w-0"
                                      }
                                      title={sem.holidayLabel}
                                      onClick={(e) => {
                                        if (eventsByDate[day]) {
                                          const rect = (
                                            e.currentTarget as HTMLElement
                                          ).getBoundingClientRect();
                                          const padding = 12;
                                          const popupWidth = 220;
                                          const popupHeight = 120;
                                          let x = rect.right + 8;
                                          let y = rect.top;
                                          if (
                                            x + popupWidth >
                                            window.innerWidth - padding
                                          ) {
                                            x = rect.left - popupWidth - 8;
                                          }
                                          if (
                                            y + popupHeight >
                                            window.innerHeight - padding
                                          ) {
                                            y =
                                              window.innerHeight -
                                              popupHeight -
                                              padding;
                                          }
                                          setPopup({
                                            date: day,
                                            x,
                                            y,
                                          });
                                        }
                                      }}
                                    >
                                      <div className="flex items-center justify-between w-full gap-1 min-w-0">
                                        <span className="truncate">
                                          {formatDay(day)}
                                        </span>
                                        <div className="flex gap-1 shrink-0">
                                          {eventsByDate[day]?.map((e) => (
                                            <span
                                              key={e.id}
                                              className={
                                                "w-2 h-2 rounded-full " +
                                                (e.type === "holiday"
                                                  ? "bg-red-400"
                                                  : "bg-indigo-400")
                                              }
                                              title={e.title}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {apartments.map((apt) => {
                                      const bookingsHere =
                                        calendarVisibleBookings?.filter(
                                          (b) =>
                                            b.apartment_id === apt.id &&
                                            isoYmdInHalfOpenStay(
                                              day,
                                              b.check_in_date,
                                              b.check_out_date,
                                            ),
                                        ) ?? [];
                                      const bookingsHereAny =
                                        bookings?.filter(
                                          (b) =>
                                            b.apartment_id === apt.id &&
                                            isoYmdInHalfOpenStay(
                                              day,
                                              b.check_in_date,
                                              b.check_out_date,
                                            ),
                                        ) ?? [];
                                      // NOTE: currently we take only the first booking.
                                      // Multiple overlapping bookings are not yet supported.
                                      const booking = bookingsHere[0];
                                      const segment = booking
                                        ? bookingCalendarSegmentInSection(
                                            booking,
                                            section.days,
                                          )
                                        : null;
                                      const isSegmentStart =
                                        segment != null && day === segment.firstDay;
                                      const staySpanNights = booking
                                        ? bookingCalendarStaySpanDays(
                                            booking.check_in_date,
                                            booking.check_out_date,
                                          )
                                        : 0;
                                      const isBooked = bookingsHereAny.length > 0;
                                      const entry = priceMap[apt.id]?.[day];
                                      const price = entry?.price;
                                      const blocked = entry?.is_blocked === true;
                                      const barRemBase =
                                        booking && segment && isSegmentStart
                                          ? bookingCalendarBarVerticalRem(
                                              booking,
                                              segment.span,
                                            )
                                          : null;
                                      const calendarBarRem = barRemBase;

                                      if (
                                        import.meta.env.DEV &&
                                        booking &&
                                        (booking.guest_name ?? "").includes(
                                          "Алина",
                                        )
                                      ) {
                                        const bottomRemTail =
                                          (bookingCalendarCheckOutBottomPercent(
                                            booking.check_out_time,
                                          ) /
                                            100) *
                                          ROW_HEIGHT;
                                        const checkoutExtraRem =
                                          ROW_HEIGHT - bottomRemTail;
                                        console.log("[DEV] Алина tail row", {
                                          guest_name: booking.guest_name,
                                          day,
                                          isSegmentStart,
                                          "segment?.span": segment?.span,
                                          checkout_date:
                                            booking.check_out_date,
                                          checkoutExtraRem,
                                          calendarBarRem,
                                          isCheckoutDayRow:
                                            day === booking.check_out_date,
                                          isDayBeforeCheckout:
                                            day ===
                                            isoAddDays(
                                              booking.check_out_date,
                                              -1,
                                            ),
                                        });
                                      }

                                      return (
                                        <div
                                          key={apt.id + "-" + day}
                                          className={
                                            (booking && !isSegmentStart
                                              ? bookingCellClasses(sem, apt.name) +
                                                " z-[1] cursor-pointer"
                                              : booking && isSegmentStart
                                                ? bookingCellClasses(sem, apt.name) +
                                                  " z-[12] cursor-pointer"
                                                : bookingCellClasses(sem, apt.name)) +
                                            (!isBooked
                                              ? " cursor-pointer hover:border-blue-400"
                                              : "") +
                                            (isInSelection(day, apt.id)
                                              ? " !bg-blue-200 before:!bg-blue-200 hover:before:!bg-blue-200"
                                              : "")
                                          }
                                          onMouseDown={(e) => {
                                            if (e.button !== 0) return;
                                            if (isBooked) return;

                                            if (e.ctrlKey && selection) {
                                              if (selection.apartmentId !== apt.id)
                                                return;
                                              const lo =
                                                selection.start < day
                                                  ? selection.start
                                                  : day;
                                              const hi =
                                                selection.start < day
                                                  ? day
                                                  : selection.start;
                                              setSelection({
                                                apartmentId: apt.id,
                                                start: lo,
                                                end: hi,
                                              });
                                              if (day !== selection.start) {
                                                openBookingModalForCreateRange(
                                                  apt.id,
                                                  lo,
                                                  hi,
                                                );
                                              }
                                              return;
                                            }

                                            if (
                                              selection &&
                                              selection.start !==
                                                selection.end &&
                                              isInSelection(day, apt.id)
                                            ) {
                                              setSelection(null);
                                              return;
                                            }

                                            if (
                                              selection &&
                                              selection.apartmentId === apt.id &&
                                              selection.start === selection.end &&
                                              day !== selection.start &&
                                              !e.ctrlKey
                                            ) {
                                              const lo =
                                                selection.start < day
                                                  ? selection.start
                                                  : day;
                                              const hi =
                                                selection.start < day
                                                  ? day
                                                  : selection.start;
                                              setSelection({
                                                apartmentId: apt.id,
                                                start: lo,
                                                end: hi,
                                              });
                                              return;
                                            }

                                            setSelection({
                                              apartmentId: apt.id,
                                              start: day,
                                              end: day,
                                            });
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            const hasRangeSelection =
                                              selection != null &&
                                              selection.apartmentId === apt.id &&
                                              isInSelection(day, apt.id);

                                            if (hasRangeSelection) {
                                              setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                day,
                                                apartmentId: apt.id,
                                                isBooked: false,
                                                rangeActions: true,
                                              });
                                              return;
                                            }

                                            if (isBooked) {
                                              setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                day,
                                                apartmentId: apt.id,
                                                isBooked: true,
                                                rangeActions: false,
                                              });
                                              return;
                                            }

                                            setContextMenu(null);
                                            setEditModal({
                                              apartmentId: apt.id,
                                              start: day,
                                              end: day,
                                            });
                                            setModalPosition({
                                              x: Math.max(
                                                16,
                                                Math.min(
                                                  e.clientX - 160,
                                                  window.innerWidth - 340,
                                                ),
                                              ),
                                              y: e.clientY + 20,
                                            });
                                          }}
                                          onClick={(e) => {
                                            if (booking) {
                                              e.stopPropagation();
                                              openBookingModalForEdit(booking);
                                              return;
                                            }
                                            e.stopPropagation();
                                            // free-cell click only updates range selection in chessboard
                                            // modal opens only after a valid range is completed (Ctrl+click)
                                          }}
                                        >
                                          {calendarBarRem != null ? (
                                            (() => {
                                              const guestHandLabel =
                                                bookingChessboardGuestHandLabel(
                                                  booking,
                                                  avitoCommissionPct,
                                                );
                                              if (
                                                import.meta.env.DEV &&
                                                booking &&
                                                isSegmentStart &&
                                                (booking.guest_name ?? "").includes(
                                                  "Алина",
                                                )
                                              ) {
                                                const maxHeightUsed =
                                                  staySpanNights === 1
                                                    ? `${ROW_HEIGHT}rem`
                                                    : `${calendarBarRem.heightRem}rem`;
                                                console.log(
                                                  "[DEV] Алина bar geometry",
                                                  {
                                                    guest_name:
                                                      booking.guest_name,
                                                    day,
                                                    "segment?.span":
                                                      segment?.span,
                                                    check_in_date:
                                                      booking.check_in_date,
                                                    check_out_date:
                                                      booking.check_out_date,
                                                    "calendarBarRem?.topRem":
                                                      calendarBarRem.topRem,
                                                    "calendarBarRem?.heightRem":
                                                      calendarBarRem.heightRem,
                                                    maxHeightUsed,
                                                    ROW_HEIGHT,
                                                  },
                                                );
                                              }
                                              return (
                                            <div
                                              className={
                                                calendarBookingBarClasses(booking) +
                                                (guestHandLabel ? " pr-8 " : "") +
                                                (segment.span === 1
                                                  ? " rounded-2xl"
                                                  : " rounded-t-2xl rounded-b-2xl")
                                              }
                                              style={
                                                staySpanNights === 1
                                                  ? {
                                                      maxHeight: `${ROW_HEIGHT}rem`,
                                                      top: 0,
                                                      height: `${ROW_HEIGHT}rem`,
                                                    }
                                                  : {
                                                      maxHeight: `${calendarBarRem.heightRem}rem`,
                                                      top: `${calendarBarRem.topRem}rem`,
                                                      height: `${calendarBarRem.heightRem}rem`,
                                                    }
                                              }
                                              title={
                                                [
                                                  bookingBlockLine1(booking),
                                                  bookingBlockLine2(booking),
                                                ]
                                                  .filter(Boolean)
                                                  .join("\n") || undefined
                                              }
                                            >
                                              {guestHandLabel ? (
                                                <span
                                                  className="pointer-events-none absolute right-0.5 top-0.5 z-[2] max-w-[58%] truncate text-right text-xs font-semibold leading-none text-green-700"
                                                  title="Мне на руки"
                                                >
                                                  {guestHandLabel}
                                                </span>
                                              ) : null}
                                              <span className="block w-full truncate text-xs leading-tight">
                                                {bookingBlockLine1(booking)}
                                              </span>
                                              {bookingBlockLine2(booking) ? (
                                                <span className="block w-full truncate text-xs leading-tight opacity-95">
                                                  {bookingBlockLine2(booking)}
                                                </span>
                                              ) : null}
                                            </div>
                                              );
                                            })()
                                          ) : null}
                                          {bookingsHere.length === 0 &&
                                          !blocked &&
                                          price != null ? (
                                            <div
                                              className="pointer-events-none absolute inset-0 flex items-center justify-center"
                                            >
                                              <span className="text-sm font-medium text-gray-800">
                                                {formatPrice(price)} ₽
                                              </span>
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 border-t border-gray-100 px-1 pb-3 pt-2">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-700">
                        {sources.map((s) => (
                          <label
                            key={s.id}
                            className="inline-flex cursor-pointer items-center gap-1.5 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={s.enabled}
                              onChange={() =>
                                setSources((prev) =>
                                  prev.map((x) =>
                                    x.id === s.id
                                      ? { ...x, enabled: !x.enabled }
                                      : x,
                                  ),
                                )
                              }
                              className="rounded border-gray-300"
                            />
                            <span
                              className={
                                "h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10 " +
                                s.color
                              }
                              aria-hidden
                            />
                            <span>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
                )
              )}
              {popup && (
                <div
                  ref={popupRef}
                  className="fixed bg-white border shadow-lg rounded p-3 z-50"
                  style={{
                    left: popup.x,
                    top: popup.y,
                  }}
                >
                  <div className="font-semibold mb-2">
                    {formatDay(popup.date)}
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    {eventsByDate[popup.date]?.map((e) => (
                      <div key={e.id}>{e.title}</div>
                    ))}
                  </div>
                </div>
              )}
              {contextMenu && (
                <div
                  ref={contextMenuRef}
                  className="fixed bg-white border shadow-md rounded p-2 z-50"
                  style={{
                    left: contextMenu.x,
                    top: contextMenu.y,
                  }}
                >
                  {contextMenu.rangeActions && selection ? (
                    <>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          openBookingModalFromSelection(
                            contextMenu.apartmentId,
                          );
                          setContextMenu(null);
                        }}
                      >
                        Создать бронь
                      </div>
                      <div
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          const lo =
                            selection.start < selection.end
                              ? selection.start
                              : selection.end;
                          const hi =
                            selection.start < selection.end
                              ? selection.end
                              : selection.start;
                          setEditModal({
                            apartmentId: selection.apartmentId,
                            start: lo,
                            end: hi,
                          });
                          setModalPosition({
                            x: Math.max(
                              16,
                              Math.min(
                                contextMenu.x - 160,
                                window.innerWidth - 340,
                              ),
                            ),
                            y: contextMenu.y + 20,
                          });
                          setContextMenu(null);
                        }}
                      >
                        Настроить даты
                      </div>
                    </>
                  ) : null}

                  {!contextMenu.isBooked &&
                    !contextMenu.rangeActions &&
                    selection &&
                    selection.apartmentId === contextMenu.apartmentId && (
                    <div
                      className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        openBookingModalFromSelection(contextMenu.apartmentId);
                      }}
                    >
                      Создать бронь
                    </div>
                  )}

                  {contextMenu.isBooked && (
                    <div
                      className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-red-600"
                      onClick={() => {
                        const booking = bookings?.find(
                          (b) =>
                            b.apartment_id === contextMenu.apartmentId &&
                            isoYmdInHalfOpenStay(
                              contextMenu.day,
                              b.check_in_date,
                              b.check_out_date,
                            ),
                        );
                        if (!booking) return;

                        const ok = window.confirm("Удалить бронь?");
                        if (!ok) return;

                        fetch(
                          `http://localhost:8000/api/bookings/${booking.id}`,
                          {
                            method: "DELETE",
                          },
                        )
                          .then((res) => {
                            if (!res.ok) {
                              console.error("DELETE booking failed", res.status);
                              return;
                            }
                            setBookings((prev) =>
                              prev
                                ? prev.filter((b) => b.id !== booking.id)
                                : prev,
                            );
                            setContextMenu(null);
                          })
                          .catch(console.error);
                      }}
                    >
                      Удалить бронь
                    </div>
                  )}
                </div>
              )}
              {editModal && activeTab === "calendar" ? (
                <div className="pointer-events-none fixed inset-0 z-[60]">
                  <div
                    ref={chessBoardPriceModalRef}
                    data-chess-price-modal
                    className="pointer-events-auto absolute z-[60]"
                    style={{
                      top: modalPosition.y,
                      left: modalPosition.x,
                    }}
                  >
                    <div className="relative w-[320px] space-y-3 rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5">
                      <div className="absolute -top-2 left-6 h-3 w-3 rotate-45 border-l border-t border-gray-200 bg-white" />
                      <div className="text-sm font-semibold">Настроить даты</div>
                      <div className="text-base font-semibold text-gray-900">
                        {formatDateRU(editModal.start)}
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
                          <span className="text-sm text-gray-700">
                            Цена за сутки
                          </span>
                          <div className="relative w-[120px]">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full rounded border border-gray-200 px-2 py-2 pr-6 text-center text-sm"
                              autoFocus={isOpen}
                              value={priceInput}
                              onChange={(ev) => {
                                const r = ev.target.value.replace(/[^\d]/g, "");
                                setPriceInput(r);
                              }}
                              onBlur={(ev) => {
                                const r = ev.target.value.replace(/[^\d]/g, "");
                                if (r) setPriceInput(formatPrice(Number(r)));
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
                        onChange={(ev) => setCommentInput(ev.target.value)}
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
            </>
          )}

          {activeTab === "sources" && (
            <>
              <h2 className="text-xl font-semibold mb-4">Источники</h2>
              <div className="max-w-2xl">
                <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
                  {sources.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSourceId(s.id)}
                      className={
                        "rounded-t-lg border border-b-0 px-3 py-1.5 text-sm font-medium transition-colors " +
                        (s.id === activeSourceId
                          ? "-mb-px border-gray-200 bg-white text-gray-900"
                          : "border-transparent bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-semibold text-gray-900">
                      Настройки «{activeSource.name}»
                    </h3>
                    <button
                      type="button"
                      onClick={() => void saveActiveSourceSettings()}
                      className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Сохранить
                    </button>
                  </div>
                  {activeSourceId === "avito" ? (
                    <div className="mt-4 space-y-5">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Доплаты
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                          {(
                            [
                              ["cleaning", "Уборка после проживания"],
                              ["adult", "Доплата за взрослого"],
                              ["child", "Доплата за ребёнка"],
                              ["pet", "Доплата за питомца"],
                            ] as const
                          ).map(([key, label]) => (
                            <label
                              key={key}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-gray-600">{label}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-36 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
                                value={rubDigitsToDisplay(
                                  avitoSurchargeDigits[key],
                                )}
                                onChange={(e) =>
                                  setAvitoSurchargeDigits((p) => ({
                                    ...p,
                                    [key]: digitsOnlyRub(e.target.value),
                                  }))
                                }
                                aria-label={label}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Скидки
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                          {avitoDiscountRows.map((row) => (
                            <div
                              key={row.id}
                              className="flex flex-wrap items-center gap-2 text-sm"
                            >
                              <span className="text-gray-500">от</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm tabular-nums"
                                placeholder="ночей"
                                value={row.nights}
                                onChange={(e) =>
                                  setAvitoDiscountRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            nights: digitsOnlyRub(
                                              e.target.value,
                                            ),
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm tabular-nums"
                                placeholder="%"
                                value={row.percent}
                                onChange={(e) =>
                                  setAvitoDiscountRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            percent: e.target.value
                                              .replace(/[^\d.,]/g, "")
                                              .replace(",", "."),
                                          }
                                        : r,
                                    ),
                                  )
                                }
                              />
                              <span className="text-gray-500">%</span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                          onClick={() =>
                            setAvitoDiscountRows((prev) => [
                              ...prev,
                              {
                                id: `${Date.now()}-${prev.length}`,
                                nights: "",
                                percent: "",
                              },
                            ])
                          }
                        >
                          + Добавить
                        </button>
                      </div>
                      <div>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-600">
                            Комиссия сайта (%)
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm tabular-nums"
                            value={avitoCommissionPct}
                            onChange={(e) =>
                              setAvitoCommissionPct(
                                e.target.value
                                  .replace(/[^\d.,]/g, "")
                                  .replace(",", "."),
                              )
                            }
                            aria-label="Комиссия сайта в процентах"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">
                        Остальные параметры настраиваются в личном кабинете
                        Авито.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Скоро здесь появятся параметры.
                    </p>
                  )}
                  <div className="mt-4">
                    <SourceCard
                      source={activeSource}
                      onEnabledChange={(id, enabled) =>
                        setSources((prev) =>
                          prev.map((x) =>
                            x.id === id ? { ...x, enabled } : x,
                          ),
                        )
                      }
                      onNameChange={(id, name) =>
                        setSources((prev) =>
                          prev.map((x) =>
                            x.id === id ? { ...x, name } : x,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "events" && (
            <>
              <h2 className="text-xl font-semibold mb-4">События</h2>
              <div className="bg-white rounded-xl shadow p-4 space-y-2 max-w-lg">
                {(Object.entries(eventsGrouped) as [string, EventItem[]][])
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, list]) => (
                    <div
                      key={date}
                      className="mb-4 border-b border-gray-100 pb-2 last:mb-0 last:border-b-0 last:pb-0"
                    >
                      <div className="text-sm font-semibold mb-1">
                        {formatDay(date)}
                      </div>
                      <div className="flex flex-col gap-1">
                        {list.map((e) => (
                          <label
                            key={e.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={enabledEvents[e.id] !== false}
                              onChange={() =>
                                setEnabledEvents((prev) => ({
                                  ...prev,
                                  [e.id]: !(prev[e.id] ?? true),
                                }))
                              }
                            />
                            <span
                              className={
                                e.type === "holiday" ? "text-red-600" : ""
                              }
                            >
                              {e.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          {activeTab === "bookings" && (
            <>
              <h2 className="text-xl font-semibold mb-4">Бронирования</h2>
              <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBookingsViewMode("table")}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    bookingsViewMode === "table"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  Таблица
                </button>
                <button
                  type="button"
                  onClick={() => setBookingsViewMode("timeline")}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    bookingsViewMode === "timeline"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  Лента
                </button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBookingsSourceFilterIds([])}
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    bookingsSourceFilterIds.length === 0
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  Все источники
                </button>
                {(
                  Object.keys(SOURCES) as BookingSourceKey[]
                ).map((sourceKey) => {
                  const src = SOURCES[sourceKey];
                  const active = bookingsSourceFilterIds.includes(sourceKey);
                  return (
                    <button
                      key={sourceKey}
                      type="button"
                      onClick={() => toggleBookingsSourceFilter(sourceKey)}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${src.color}`}
                        aria-hidden
                      />
                      <span>{src.label}</span>
                      {active && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBookingsStudioFilterIds([])}
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    bookingsStudioFilterIds.length === 0
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  Все студии
                </button>
                {(apartments ?? []).map((a) => {
                  const active = bookingsStudioFilterIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleBookingsStudioFilter(a.id)}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${timelineApartmentDotClass(
                          a.name,
                        )}`}
                        aria-hidden
                      />
                      <span>{a.name}</span>
                    </button>
                  );
                })}
              </div>
              {bookingsViewMode === "timeline" ? (
                <div className="flex min-h-0 flex-1 w-full max-w-full flex-col rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600 shadow">
                  {timelineMonthGroups.length === 0 ? (
                    <div>Скоро: Лента заездов</div>
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      <div className="space-y-4">
                        {timelineMonthGroups.map((monthGroup) => (
                        <section
                          key={monthGroup.monthKey}
                          className="rounded-lg border border-gray-200 bg-white p-2"
                        >
                          <button
                            type="button"
                            className="mb-2 grid min-h-[30px] w-full grid-cols-[minmax(0,1fr)_9.5rem_1rem] items-center gap-x-2 rounded-md px-2 py-0.5 text-left hover:bg-gray-50"
                            onClick={() =>
                              toggleTimelineMonth(monthGroup.monthKey)
                            }
                          >
                            <div className="min-w-0 pl-0.5">
                              <div className="truncate text-sm font-medium text-gray-700">
                                {monthGroup.monthLabel}
                              </div>
                              <div className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-gray-500/90">
                                <span className="shrink-0">
                                  {formatArrivalsCount(monthGroup.bookingsCount)}
                                </span>
                                {monthGroup.occupancyByApartment.map((apt) => (
                                  <span
                                    key={apt.apartmentName}
                                    className="inline-flex min-w-0 items-center gap-1"
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${timelineApartmentDotClass(apt.apartmentName)}`}
                                      aria-hidden
                                    />
                                    <span className="truncate">
                                      {apt.apartmentName} {formatNightsCountRu(apt.nights)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="w-[9.5rem] shrink-0 text-right leading-tight">
                              <div className="whitespace-nowrap text-sm font-semibold text-green-700">
                                {monthGroup.monthIncomeLabel}
                              </div>
                              <div className="whitespace-nowrap text-[11px] text-gray-500">
                                {monthGroup.avgOccupiedLabel} / {monthGroup.avgCalendarLabel}
                              </div>
                            </div>
                            <span className="justify-self-end text-xs text-gray-500">
                              {timelineMonthOpen[monthGroup.monthKey]
                                ? "▼"
                                : "▶"}
                            </span>
                          </button>
                          {timelineMonthOpen[monthGroup.monthKey] && (
                            <div className="space-y-3 pl-2.5">
                              {monthGroup.days.map((dayGroup) => (
                                <div key={dayGroup.day}>
                                  <div
                                    className={[
                                      "mb-1 text-[13px] font-medium",
                                      isTimelineWeekend(dayGroup.day)
                                        ? "text-red-600"
                                        : "text-sky-700",
                                    ].join(" ")}
                                  >
                                    {formatTimelineDayLabel(dayGroup.day)}
                                  </div>
                                  <div className="space-y-1">
                                    {dayGroup.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="grid cursor-pointer grid-cols-12 items-center gap-x-2 gap-y-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-100 sm:grid-cols-[7.2rem_minmax(0,1fr)_max-content_3.6rem_5rem_6.5rem]"
                                        onClick={() => openBookingModalById(item.id)}
                                      >
                                        <div className="col-span-12 flex items-center gap-1.5 whitespace-nowrap sm:col-auto">
                                          <span className="w-10 shrink-0 text-xs tabular-nums text-gray-500">
                                            {item.checkInTimeLabel}
                                          </span>
                                          <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.apartmentDotClass}`}
                                            aria-hidden
                                          />
                                          <span className="text-sm text-gray-800">
                                            {item.apartmentName}
                                          </span>
                                        </div>
                                        <div className="col-span-12 min-w-0 sm:col-auto sm:truncate">
                                          {item.guestLine}
                                        </div>
                                        <div className="col-span-6 min-w-0 whitespace-nowrap text-left sm:col-auto sm:w-full">
                                          <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                                            <span
                                              className={`h-2 w-2 shrink-0 rounded-full ${item.sourceBadgeClass}`}
                                              aria-hidden
                                            />
                                            <span className="min-w-0 truncate">
                                              {item.sourceLabel}
                                            </span>
                                          </span>
                                        </div>
                                        <div className="col-span-3 whitespace-nowrap text-xs text-gray-500 sm:col-auto sm:text-sm">
                                          {item.nightsLabel}
                                        </div>
                                        <div className="col-span-6 whitespace-nowrap text-xs text-gray-500 sm:col-auto sm:text-sm">
                                          {item.checkoutLabel}
                                        </div>
                                        <div
                                          className={[
                                            "col-span-3 whitespace-nowrap text-right text-sm sm:col-auto",
                                            item.payoutHasValue
                                              ? "font-medium text-green-700"
                                              : "text-gray-400",
                                          ].join(" ")}
                                        >
                                          {item.payoutLabel}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <div className="w-full max-w-full overflow-x-auto rounded-xl bg-white p-4 shadow">
                {bookings === null || sortedBookings === null ? (
                  <p>Loading...</p>
                ) : (
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th
                          className="w-[9rem] min-w-0 cursor-pointer whitespace-nowrap px-2 py-2 font-medium"
                          onClick={() => handleBookingsSort("check_in_date")}
                        >
                          Заезд{sortHeaderArrow("check_in_date")}
                        </th>
                        <th
                          className="w-[5rem] min-w-0 cursor-pointer whitespace-nowrap px-2 py-2 font-medium"
                          onClick={() => handleBookingsSort("check_out_date")}
                        >
                          Выезд{sortHeaderArrow("check_out_date")}
                        </th>
                        <th
                          className="w-[10ch] min-w-0 max-w-[10ch] cursor-pointer truncate px-2 py-2 font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("apartment")}
                        >
                          Студия{sortHeaderArrow("apartment")}
                        </th>
                        <th
                          className="relative min-w-0 cursor-pointer truncate px-2 py-2 font-medium"
                          style={{
                            width: bookingsColumnWidths.guest,
                            minWidth: BOOKINGS_COL_MIN.guest,
                          }}
                          onClick={() => handleBookingsSort("guest_name")}
                        >
                          Гость{sortHeaderArrow("guest_name")}
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Изменить ширину столбца «Гость»"
                            className="absolute right-0 top-0 z-10 flex h-full w-2 translate-x-1/2 cursor-col-resize items-stretch justify-center border-0 bg-transparent p-0 hover:bg-gray-300/25"
                            onMouseDown={(e) =>
                              beginBookingsColResize(
                                e,
                                "guest",
                                bookingsColumnWidths.guest,
                              )
                            }
                          >
                            <span className="pointer-events-none my-1 w-px shrink-0 bg-gray-300" />
                          </button>
                        </th>
                        <th
                          className="w-[13ch] min-w-[13ch] max-w-[13ch] cursor-pointer truncate px-2 py-2 font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("source")}
                        >
                          Источник{sortHeaderArrow("source")}
                        </th>
                        <th
                          className="min-w-0 cursor-pointer whitespace-nowrap px-2 py-2 font-medium"
                          style={{
                            width: "8ch",
                            minWidth: "8ch",
                          }}
                          onClick={() => handleBookingsSort("total_price")}
                        >
                          Цена{sortHeaderArrow("total_price")}
                        </th>
                        <th
                          className="min-w-0 cursor-pointer whitespace-nowrap px-2 py-2 font-medium"
                          style={{
                            width: "11ch",
                            minWidth: "11ch",
                          }}
                          onClick={() => handleBookingsSort("owner_price")}
                        >
                          На руки{sortHeaderArrow("owner_price")}
                        </th>
                        <th
                          className={
                            "relative min-w-0 cursor-pointer px-2 py-2 text-left font-medium whitespace-nowrap" +
                            (bookingsColManual.comment ? "" : " w-full")
                          }
                          style={
                            bookingsColManual.comment
                              ? {
                                  width: bookingsColumnWidths.comment,
                                  minWidth: BOOKINGS_COL_MIN.comment,
                                }
                              : undefined
                          }
                          onClick={() => handleBookingsSort("comment")}
                        >
                          Коммент{sortHeaderArrow("comment")}
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label="Изменить ширину столбца «Коммент»"
                            className="absolute right-0 top-0 z-10 flex h-full w-2 translate-x-1/2 cursor-col-resize items-stretch justify-center border-0 bg-transparent p-0 hover:bg-gray-300/25"
                            onMouseDown={(e) =>
                              beginBookingsColResize(
                                e,
                                "comment",
                                bookingsColumnWidths.comment,
                              )
                            }
                          >
                            <span className="pointer-events-none my-1 w-px shrink-0 bg-gray-300" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBookings.map((b) => {
                        const srcKey = bookingTableSourceKey(b.source);
                        const src = SOURCES[srcKey];
                        const apartmentName =
                          apartments?.find((a) => a.id === b.apartment_id)?.name ??
                          String(b.apartment_id);
                        return (
                        <tr
                          key={b.id}
                          className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                          onClick={() => openBookingModalForEdit(b)}
                        >
                          <td className="w-[9rem] min-w-0 whitespace-nowrap px-2 py-2 align-top">
                            {formatBookingTableArrivalDayTime(
                              b.check_in_date,
                              b.check_in_time,
                            )}
                          </td>
                          <td className="w-[5rem] min-w-0 whitespace-nowrap px-2 py-2 align-top">
                            {formatBookingTableDayTime(
                              b.check_out_date,
                              b.check_out_time,
                            )}
                          </td>
                          <td className="w-[10ch] min-w-0 max-w-[10ch] truncate whitespace-nowrap px-2 py-2 align-top">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${timelineApartmentDotClass(apartmentName)}`}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate">{apartmentName}</span>
                            </span>
                          </td>
                          <td
                            className="min-w-0 truncate px-2 py-2 align-top"
                            style={{
                              width: bookingsColumnWidths.guest,
                              minWidth: BOOKINGS_COL_MIN.guest,
                            }}
                          >
                            <div className="flex min-w-0 flex-col leading-tight">
                              <div className="truncate whitespace-nowrap">
                                {b.guest_name?.trim() ? b.guest_name : "—"}
                              </div>
                              <div className="whitespace-nowrap text-[10px] text-gray-500">
                                {b.guests_count != null
                                  ? `${b.guests_count} гост.`
                                  : "—"}
                              </div>
                            </div>
                          </td>
                          <td className="w-[13ch] min-w-[13ch] max-w-[13ch] truncate px-2 py-2 align-top whitespace-nowrap">
                            <span className="flex min-w-0 max-w-full items-center gap-2">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${src.color}`}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate">
                                {src.label}
                              </span>
                            </span>
                          </td>
                          <td
                            className="min-w-0 px-2 py-2 align-top text-center tabular-nums whitespace-nowrap"
                            style={{
                              width: "8ch",
                              minWidth: "8ch",
                            }}
                          >
                            {b.total_price != null
                              ? `${b.total_price} ${bookingCurrencySymbol(b.currency)}`
                              : "—"}
                          </td>
                          <td
                            className="min-w-0 px-2 py-2 align-top text-right tabular-nums whitespace-nowrap font-medium"
                            style={{
                              width: "11ch",
                              minWidth: "11ch",
                            }}
                          >
                            {b.owner_price != null
                              ? (
                                <span className="text-green-700">
                                  {formatTimelinePayout(b.owner_price)}
                                </span>
                              )
                              : "—"}
                          </td>
                          <td
                            className={
                              "min-w-0 max-w-none truncate px-2 py-2 align-top text-gray-800" +
                              (bookingsColManual.comment ? "" : " w-full")
                            }
                            style={
                              bookingsColManual.comment
                                ? {
                                    width: bookingsColumnWidths.comment,
                                    minWidth: BOOKINGS_COL_MIN.comment,
                                  }
                                : undefined
                            }
                            title={b.notes?.trim() ? b.notes : undefined}
                          >
                            {b.notes?.trim() ? b.notes : "—"}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              )}
            </>
          )}

          {activeTab === "priceCalendar" && (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white shadow">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
                <div className="grid shrink-0 grid-cols-1 gap-4 border-b border-gray-300/80 bg-gray-200 px-4 pb-2 pt-0.5 lg:grid-cols-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800">
                      {apartments?.[0]?.name || "Квартира 1"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800">
                      {apartments?.[1]?.name || "Квартира 2"}
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden rounded-t-xl bg-white">
                  <div className="h-full min-h-0 overflow-x-hidden overflow-y-auto px-4 pb-10">
                    <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-h-0">
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
                          <div className="min-w-0 pt-2">
                            <PriceCalendar
                              apartmentId={apartments?.[0]?.id || 1}
                              events={events}
                              enabledEvents={enabledEvents}
                              scrollMode="parent"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-h-0">
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
                          <div className="min-w-0 pt-2">
                            <PriceCalendar
                              apartmentId={apartments?.[1]?.id || 2}
                              events={events}
                              enabledEvents={enabledEvents}
                              scrollMode="parent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "apartments" && (
            <>
              <h1 className="text-2xl font-bold mb-6">Apartments</h1>

              <ApartmentForm
                name={name}
                address={address}
                onChangeName={(e) => setName(e.target.value)}
                onChangeAddress={(e) => setAddress(e.target.value)}
                onSubmit={handleCreate}
              />

              {apartments === null ? (
                <p>Loading...</p>
              ) : apartments.length === 0 ? (
                <p>No apartments</p>
              ) : (
                <ApartmentsList
                  apartments={apartments}
                  editingId={editingId}
                  editName={editName}
                  editAddress={editAddress}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onDelete={handleDelete}
                  setEditName={setEditName}
                  setEditAddress={setEditAddress}
                />
              )}
            </>
          )}

          {bookingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="flex max-h-[90vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="shrink-0 border-b border-gray-200 px-6 py-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {bookingModal.bookingId != null
                      ? "Редактировать бронь"
                      : "Создать бронь"}
                  </h2>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-gray-700">
                    <span
                      className={`mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm ${bookingModalStudioSquareClass(
                        apartments?.find(
                          (a) => a.id === bookingModal.apartmentId,
                        )?.name ?? "",
                      )}`}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate font-medium text-gray-900">
                      {apartments?.find((a) => a.id === bookingModal.apartmentId)
                        ?.name ?? "—"}
                    </span>
                    <span className="shrink-0 text-gray-400">•</span>
                    <span className="min-w-0 text-gray-600">
                      {formatBookingModalHeaderRange(
                        bookingModal.start,
                        bookingModal.end,
                      )}
                    </span>
                    <span className="shrink-0 text-gray-400">•</span>
                    <span className="shrink-0 whitespace-nowrap text-gray-600">
                      {bookingModalNightsLabel(
                        bookingNightCountForModal(
                          bookingModal.start,
                          bookingModal.end,
                        ),
                      )}
                    </span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <section className="space-y-2 rounded-xl bg-gray-50 p-3">
                    <h3 className="text-sm font-bold text-gray-800">
                      Основное
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="w-12 shrink-0 text-xs font-medium text-gray-600">
                            Заезд:
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-[11rem]">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="ДД/ММ/ГГГГ"
                              autoComplete="off"
                              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                              value={bookingModalMain.dmyStart}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  dmyStart: e.target.value,
                                }))
                              }
                              onBlur={(e) => {
                                const iso = parseRuDmyToIsoYmd(
                                  (e.target as HTMLInputElement).value,
                                );
                                if (iso)
                                  setBookingModal((m) =>
                                    m ? { ...m, start: iso } : m,
                                  );
                                else
                                  setBookingModalMain((p) => ({
                                    ...p,
                                    dmyStart: isoYmdToRuDmy(bookingModal.start),
                                  }));
                              }}
                            />
                            <input
                              ref={bookingDateStartRef}
                              type="date"
                              className="sr-only"
                              tabIndex={-1}
                              value={bookingModal.start.slice(0, 10)}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v)
                                  setBookingModal((m) =>
                                    m ? { ...m, start: v } : m,
                                  );
                              }}
                            />
                            <button
                              type="button"
                              className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              aria-label="Календарь заезда"
                              onClick={() => {
                                const el = bookingDateStartRef.current;
                                if (!el) return;
                                if (typeof el.showPicker === "function")
                                  el.showPicker();
                                else el.click();
                              }}
                            >
                              📅
                            </button>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="ЧЧ:ММ"
                            autoComplete="off"
                            className="w-[4.75rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm tabular-nums"
                            value={formData.check_in_time || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                check_in_time: e.target.value,
                              })
                            }
                            onBlur={(e) => {
                              const n = normalizeTimeHhMm(
                                (e.target as HTMLInputElement).value,
                              );
                              setFormData((p) => ({
                                ...p,
                                check_in_time: n,
                              }));
                            }}
                            aria-label="Время заезда"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="w-12 shrink-0 text-xs font-medium text-gray-600">
                            Выезд:
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-[11rem]">
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="ДД/ММ/ГГГГ"
                              autoComplete="off"
                              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                              value={bookingModalMain.dmyEnd}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  dmyEnd: e.target.value,
                                }))
                              }
                              onBlur={(e) => {
                                const iso = parseRuDmyToIsoYmd(
                                  (e.target as HTMLInputElement).value,
                                );
                                if (iso)
                                  setBookingModal((m) =>
                                    m ? { ...m, end: iso } : m,
                                  );
                                else
                                  setBookingModalMain((p) => ({
                                    ...p,
                                    dmyEnd: isoYmdToRuDmy(bookingModal.end),
                                  }));
                              }}
                            />
                            <input
                              ref={bookingDateEndRef}
                              type="date"
                              className="sr-only"
                              tabIndex={-1}
                              value={bookingModal.end.slice(0, 10)}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v)
                                  setBookingModal((m) =>
                                    m ? { ...m, end: v } : m,
                                  );
                              }}
                            />
                            <button
                              type="button"
                              className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              aria-label="Календарь выезда"
                              onClick={() => {
                                const el = bookingDateEndRef.current;
                                if (!el) return;
                                if (typeof el.showPicker === "function")
                                  el.showPicker();
                                else el.click();
                              }}
                            >
                              📅
                            </button>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="ЧЧ:ММ"
                            autoComplete="off"
                            className="w-[4.75rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm tabular-nums"
                            value={formData.check_out_time || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                check_out_time: e.target.value,
                              })
                            }
                            onBlur={(e) => {
                              const n = normalizeTimeHhMm(
                                (e.target as HTMLInputElement).value,
                              );
                              setFormData((p) => ({
                                ...p,
                                check_out_time: n,
                              }));
                            }}
                            aria-label="Время выезда"
                          />
                        </div>
                        {(() => {
                          const nightsOwn = Math.max(
                            1,
                            bookingNightCountForModal(
                              bookingModal.start,
                              bookingModal.end,
                            ),
                          );
                          const handOwn = parseOwnerHandInput(
                            formData.owner_price,
                          );
                          const ownerPerNight =
                            handOwn != null && Number.isFinite(handOwn)
                              ? Math.round(handOwn / nightsOwn)
                              : null;
                          return (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="shrink-0 text-xs font-medium text-gray-600">
                                Мне на руки:
                              </span>
                              <input
                                placeholder="Мои деньги"
                                className="w-[6.75rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-bold tabular-nums text-green-700"
                                inputMode="decimal"
                                value={formData.owner_price}
                                onChange={(e) => {
                                  setOwnerHandDirty(true);
                                  setFormData({
                                    ...formData,
                                    owner_price: e.target.value.replace(
                                      /[^\d\s,.\-]/g,
                                      "",
                                    ),
                                  });
                                }}
                                onBlur={() => {
                                  const raw = normalizeOwnerPriceForBlurFormat(
                                    formData.owner_price,
                                  );
                                  setFormData((p) => ({
                                    ...p,
                                    owner_price:
                                      fmtOwnerPriceThousandsForInput(raw),
                                  }));
                                }}
                                aria-label="Мне на руки"
                              />
                              {ownerPerNight != null ? (
                                <span className="shrink-0 text-xs tabular-nums text-gray-600">
                                  {ownerPerNight} ₽/сут
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-gray-600">
                            Источник
                          </div>
                          <select
                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={formData.source}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                source: e.target.value,
                              })
                            }
                          >
                            {(
                              Object.values(SOURCES) as (typeof SOURCES)[keyof typeof SOURCES][]
                            ).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="shrink-0 font-medium text-gray-600">
                            Гостей:
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="w-14 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm"
                            value={
                              bookingModalMain.adults + bookingModalMain.children
                            }
                            onChange={(e) => {
                              const t = Math.max(
                                1,
                                Number(e.target.value) || 1,
                              );
                              setBookingModalMain((p) => {
                                const ch = Math.min(
                                  p.children,
                                  Math.max(0, t - 1),
                                );
                                return {
                                  ...p,
                                  adults: Math.max(1, t - ch),
                                  children: ch,
                                };
                              });
                            }}
                            aria-label="Всего гостей"
                          />
                          <span className="shrink-0 font-medium text-gray-600">
                            Дети:
                          </span>
                          <input
                            type="number"
                            min={0}
                            className="w-14 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm"
                            value={bookingModalMain.children}
                            onChange={(e) => {
                              const c = Math.max(
                                0,
                                Number(e.target.value) || 0,
                              );
                              setBookingModalMain((p) => {
                                const t = p.adults + p.children;
                                const ch = Math.min(
                                  c,
                                  Math.max(0, t - 1),
                                );
                                const ad = Math.max(1, t - ch);
                                return {
                                  ...p,
                                  adults: ad,
                                  children: t - ad,
                                };
                              });
                            }}
                            aria-label="Дети"
                          />
                        </div>
                        <p className="text-[11px] leading-tight text-gray-500">
                          {ruAdultsChildrenSummary(
                            bookingModalMain.adults,
                            bookingModalMain.children,
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="shrink-0 text-xs font-medium text-gray-600">
                            Гость:
                          </span>
                          <input
                            ref={bookingGuestNameRef}
                            placeholder="ФИО"
                            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={formData.guest_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                guest_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="shrink-0 text-xs font-medium text-gray-600">
                            Телефон:
                          </span>
                          <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+7 …"
                            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={bookingModalMain.phone}
                            onChange={(e) =>
                              setBookingModalMain((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          <label className="inline-flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={bookingModalMain.contactTg}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  contactTg: e.target.checked,
                                }))
                              }
                            />
                            Telegram
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={bookingModalMain.contactWa}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  contactWa: e.target.checked,
                                }))
                              }
                            />
                            WhatsApp
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={bookingModalMain.contactMax}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  contactMax: e.target.checked,
                                }))
                              }
                            />
                            Max
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={bookingModalMain.contactVk}
                              onChange={(e) =>
                                setBookingModalMain((p) => ({
                                  ...p,
                                  contactVk: e.target.checked,
                                }))
                              }
                            />
                            VK
                          </label>
                        </div>
                      </div>
                    <details
                      key={`bm-notes-${bookingModal.bookingId ?? "new"}-${bookingModal.start}-${bookingModal.end}`}
                      className="min-w-0 rounded-md border border-gray-200 bg-white md:col-span-2"
                      defaultOpen={formData.notes.trim().length > 0}
                    >
                      <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="shrink-0 font-mono text-[11px] leading-none text-gray-500"
                            aria-hidden
                          >
                            ▸
                          </span>
                          <span className="shrink-0">Коммент</span>
                          {formData.notes.trim() ? (
                            <span
                              className="min-w-0 truncate font-normal text-gray-500"
                              title={formData.notes.trim()}
                            >
                              · {formData.notes.trim().slice(0, 60)}
                              {formData.notes.trim().length > 60 ? "…" : ""}
                            </span>
                          ) : null}
                        </span>
                      </summary>
                      <div className="px-2 pb-2">
                        <textarea
                          rows={2}
                          className="mt-1 w-full min-w-0 resize-none rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                          placeholder="Комментарий"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              notes: e.target.value,
                            })
                          }
                          aria-label="Комментарий к брони"
                        />
                      </div>
                    </details>
                    </div>
                  </section>

                  <section className="space-y-2 rounded-xl bg-gray-50 p-3">
                    <h3 className="text-sm font-bold text-gray-800">
                      💰 Финансы
                    </h3>
                    {(() => {
                      const nights = bookingNightCountForModal(
                        bookingModal.start,
                        bookingModal.end,
                      );
                      const nightsClamped = Math.max(1, nights);
                      const guestNum = parseOwnerHandInput(formData.total_price);
                      const guestPerNight =
                        guestNum != null &&
                        Number.isFinite(guestNum) &&
                        guestNum > 0
                          ? Math.round(guestNum / nightsClamped)
                          : null;
                      const ownerNum = parseOwnerHandInput(formData.owner_price);
                      const ownerPerNight =
                        ownerNum != null &&
                        Number.isFinite(ownerNum) &&
                        ownerNum > 0
                          ? Math.round(ownerNum / nightsClamped)
                          : null;
                      const curSym = bookingCurrencySymbol("RUB");
                      return (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                          <div className="min-w-0 space-y-2.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="shrink-0 text-xs font-medium text-gray-600">
                                Цена гостя:
                              </span>
                              <input
                                className="w-[7.25rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-semibold tabular-nums text-gray-900"
                                inputMode="decimal"
                                placeholder="0"
                                value={formData.total_price}
                                onChange={(e) => {
                                  setGuestPriceDirty(true);
                                  setFormData({
                                    ...formData,
                                    total_price: e.target.value.replace(
                                      /[^\d\s,.\-]/g,
                                      "",
                                    ),
                                  });
                                }}
                                onBlur={() => {
                                  const raw = normalizeOwnerPriceForBlurFormat(
                                    formData.total_price,
                                  );
                                  setFormData((p) => ({
                                    ...p,
                                    total_price:
                                      fmtOwnerPriceThousandsForInput(raw),
                                  }));
                                }}
                                aria-label="Цена гостя"
                              />
                              {guestPerNight != null ? (
                                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                                  {guestPerNight} {curSym}/сут
                                </span>
                              ) : null}
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="shrink-0 text-xs font-medium text-gray-600">
                                Комиссия сайта:
                              </span>
                              <input
                                className="w-[6.5rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-sm tabular-nums text-gray-900"
                                inputMode="decimal"
                                value={bookingFinanceExtra.commissionRub}
                                onChange={(e) =>
                                  setBookingFinanceExtra((p) => ({
                                    ...p,
                                    commissionRub: e.target.value.replace(
                                      /[^\d\s,.\-]/g,
                                      "",
                                    ),
                                  }))
                                }
                                onBlur={() => {
                                  const raw = normalizeOwnerPriceForBlurFormat(
                                    bookingFinanceExtra.commissionRub,
                                  );
                                  setBookingFinanceExtra((p) => ({
                                    ...p,
                                    commissionRub:
                                      fmtOwnerPriceThousandsForInput(raw),
                                  }));
                                }}
                                aria-label="Комиссия сайта, сумма"
                              />
                              <input
                                className="w-12 shrink-0 rounded-md border border-gray-200 bg-white px-1 py-1.5 text-center text-xs tabular-nums text-gray-900"
                                inputMode="numeric"
                                value={bookingFinanceExtra.commissionPct}
                                onChange={(e) =>
                                  setBookingFinanceExtra((p) => ({
                                    ...p,
                                    commissionPct: e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 3),
                                  }))
                                }
                                onBlur={() =>
                                  setBookingFinanceExtra((p) => {
                                    const n = Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        Number(p.commissionPct) || 0,
                                      ),
                                    );
                                    return {
                                      ...p,
                                      commissionPct: String(Math.round(n)),
                                    };
                                  })
                                }
                                aria-label="Комиссия, процент"
                              />
                              <span className="shrink-0 text-xs text-gray-500">
                                %
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="shrink-0 text-xs font-medium text-gray-600">
                                Мне на руки:
                              </span>
                              <input
                                className="w-[7.25rem] shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-center text-sm font-bold tabular-nums text-green-700"
                                inputMode="decimal"
                                placeholder="Мои деньги"
                                value={formData.owner_price}
                                onChange={(e) => {
                                  setOwnerHandDirty(true);
                                  setFormData({
                                    ...formData,
                                    owner_price: e.target.value.replace(
                                      /[^\d\s,.\-]/g,
                                      "",
                                    ),
                                  });
                                }}
                                onBlur={() => {
                                  const raw = normalizeOwnerPriceForBlurFormat(
                                    formData.owner_price,
                                  );
                                  setFormData((p) => ({
                                    ...p,
                                    owner_price:
                                      fmtOwnerPriceThousandsForInput(raw),
                                  }));
                                }}
                                aria-label="Мне на руки, финансы"
                              />
                              {ownerPerNight != null ? (
                                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                                  {ownerPerNight} {curSym}/сут
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="min-w-0 space-y-2.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="shrink-0 text-xs font-medium text-gray-600">
                                Получено:
                              </span>
                              <div className="flex w-[7.25rem] shrink-0 items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                <input
                                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-center text-sm font-semibold tabular-nums text-gray-900 outline-none focus:ring-0"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={bookingFinanceExtra.paidRub}
                                  onChange={(e) =>
                                    setBookingFinanceExtra((p) => ({
                                      ...p,
                                      paidRub: e.target.value.replace(
                                        /[^\d\s,.\-]/g,
                                        "",
                                      ),
                                    }))
                                  }
                                  onBlur={() => {
                                    const raw = normalizeOwnerPriceForBlurFormat(
                                      bookingFinanceExtra.paidRub,
                                    );
                                    setBookingFinanceExtra((p) => ({
                                      ...p,
                                      paidRub:
                                        fmtOwnerPriceThousandsForInput(raw),
                                    }));
                                  }}
                                  aria-label="Получено"
                                />
                                <span
                                  className="shrink-0 pr-1.5 text-sm font-semibold tabular-nums text-gray-600"
                                  aria-hidden
                                >
                                  {curSym}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-xs font-medium text-gray-600">
                                Дата оплаты
                              </div>
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-[11rem]">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="ДД/ММ/ГГГГ"
                                    autoComplete="off"
                                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
                                    value={bookingFinanceExtra.paidDateDmy}
                                    onChange={(e) =>
                                      setBookingFinanceExtra((p) => ({
                                        ...p,
                                        paidDateDmy: e.target.value,
                                      }))
                                    }
                                    onBlur={(e) => {
                                      const v = (
                                        e.target as HTMLInputElement
                                      ).value.trim();
                                      if (!v) return;
                                      const iso = parseRuDmyToIsoYmd(v);
                                      if (iso)
                                        setBookingFinanceExtra((p) => ({
                                          ...p,
                                          paidDateDmy: isoYmdToRuDmy(iso),
                                        }));
                                    }}
                                    aria-label="Дата оплаты"
                                  />
                                  <input
                                    ref={bookingPaymentDateRef}
                                    type="date"
                                    className="sr-only"
                                    tabIndex={-1}
                                    value={
                                      parseRuDmyToIsoYmd(
                                        bookingFinanceExtra.paidDateDmy.trim(),
                                      ) ?? ""
                                    }
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v)
                                        setBookingFinanceExtra((p) => ({
                                          ...p,
                                          paidDateDmy: isoYmdToRuDmy(v),
                                        }));
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                    aria-label="Календарь даты оплаты"
                                    onClick={() => {
                                      const el = bookingPaymentDateRef.current;
                                      if (!el) return;
                                      if (typeof el.showPicker === "function")
                                        el.showPicker();
                                      else el.click();
                                    }}
                                  >
                                    📅
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                  onClick={() =>
                                    setBookingFinanceExtra((p) => ({
                                      ...p,
                                      paidDateDmy: isoYmdToRuDmy(
                                        localTodayKey(),
                                      ),
                                    }))
                                  }
                                >
                                  Сегодня
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-gray-600">
                                Способ оплаты
                              </div>
                              <div className="flex flex-row flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                                <label className="inline-flex cursor-pointer items-center gap-2">
                                  <input
                                    type="radio"
                                    name="booking-pay-method"
                                    className="border-gray-300"
                                    checked={
                                      bookingFinanceExtra.paymentMethod ===
                                      "cash"
                                    }
                                    onChange={() =>
                                      setBookingFinanceExtra((p) => ({
                                        ...p,
                                        paymentMethod: "cash",
                                      }))
                                    }
                                  />
                                  Наличные
                                </label>
                                <label className="inline-flex cursor-pointer items-center gap-2">
                                  <input
                                    type="radio"
                                    name="booking-pay-method"
                                    className="border-gray-300"
                                    checked={
                                      bookingFinanceExtra.paymentMethod ===
                                      "alpha"
                                    }
                                    onChange={() =>
                                      setBookingFinanceExtra((p) => ({
                                        ...p,
                                        paymentMethod: "alpha",
                                      }))
                                    }
                                  />
                                  Альфа-карта
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </section>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white p-6">
                  <div>
                    {bookingModal.bookingId != null && (
                      <button
                        type="button"
                        className="rounded-lg bg-red-500 px-3 py-1 text-sm text-black hover:bg-red-600"
                        onClick={() => {
                          const id = bookingModal.bookingId;
                          if (id == null) return;
                          fetch(
                            `http://localhost:8000/api/bookings/${id}/cancel`,
                            { method: "PATCH" },
                          )
                            .then((res) => {
                              if (!res.ok) throw new Error(String(res.status));
                              return fetch(
                                "http://localhost:8000/api/bookings/",
                              ).then((r) => {
                                if (!r.ok) throw new Error(String(r.status));
                                return r.json();
                              });
                            })
                            .then(setBookings)
                            .then(() => {
                              setBookingModal(null);
                              setSelection(null);
                            })
                            .catch(console.error);
                        }}
                      >
                        Отменить бронь
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => setBookingModal(null)}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      ref={bookingModalSaveRef}
                      className="rounded-lg bg-green-500 px-3 py-1 text-sm text-black hover:bg-green-600"
                      onClick={() => {
                      const payload = {
                        check_in_date: bookingModal.start,
                        check_out_date: bookingModal.end,
                        guest_name: formData.guest_name,
                        guest_contact: bookingModalMain.phone.trim()
                          ? bookingModalMain.phone.trim()
                          : null,
                        guests_count:
                          bookingModalMain.adults + bookingModalMain.children,
                        messengers: encodeBookingMessengers(bookingModalMain),
                        total_price:
                          parseOwnerHandInput(formData.total_price) ?? 0,
                        owner_price: parseOwnerHandInput(formData.owner_price),
                        currency: "RUB",
                        check_in_time: formData.check_in_time.trim()
                          ? formData.check_in_time
                          : null,
                        check_out_time: formData.check_out_time.trim()
                          ? formData.check_out_time
                          : null,
                        notes: formData.notes.trim()
                          ? formData.notes
                          : null,
                        source: formData.source,
                        commission_price: parseOwnerHandInput(
                          bookingFinanceExtra.commissionRub,
                        ),
                        commission_percent: (() => {
                          const t = bookingFinanceExtra.commissionPct.trim();
                          if (t === "") return null;
                          const n = Number(t);
                          if (!Number.isFinite(n)) return null;
                          return Math.min(100, Math.max(0, n));
                        })(),
                        paid_amount: parseOwnerHandInput(
                          bookingFinanceExtra.paidRub,
                        ),
                        paid_date: (() => {
                          const d = bookingFinanceExtra.paidDateDmy.trim();
                          if (!d) return null;
                          return parseRuDmyToIsoYmd(d) ?? null;
                        })(),
                        payment_method: bookingFinanceExtra.paymentMethod,
                      };
                      const isEdit = bookingModal.bookingId != null;
                      const url = isEdit
                        ? `http://localhost:8000/api/bookings/${bookingModal.bookingId}`
                        : "http://localhost:8000/api/bookings/";
                      const method = isEdit ? "PATCH" : "POST";
                      const body = isEdit
                        ? JSON.stringify(payload)
                        : JSON.stringify({
                            apartment_id: bookingModal.apartmentId,
                            ...payload,
                          });
                      fetch(url, {
                        method,
                        headers: { "Content-Type": "application/json" },
                        body,
                      })
                        .then((res) => {
                          if (!res.ok) throw new Error(String(res.status));
                          return res.json();
                        })
                        .then(() =>
                          fetch("http://localhost:8000/api/bookings/").then(
                            (r) => {
                              if (!r.ok) throw new Error(String(r.status));
                              return r.json();
                            },
                          ),
                        )
                        .then(setBookings)
                        .then(() => {
                          setBookingModal(null);
                          setSelection(null);
                        })
                        .catch(console.error);
                    }}
                  >
                    {bookingModal.bookingId != null ? "Сохранить" : "Создать"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
