import React, { useEffect, useMemo, useRef, useState } from "react";
import { ApartmentForm } from "./components/ApartmentForm";
import { ApartmentsList, type Apartment } from "./components/ApartmentsList";

type Booking = {
  id: number;
  apartment_id: number;
  check_in_date: string;
  check_out_date: string;
  guest_name?: string;
  total_price?: number;
  currency?: string;
  status?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
};

type EventItem = {
  id: string;
  date: string;
  title: string;
  type: "holiday" | "city";
};

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
  const base = "h-8 border border-gray-200 ";
  if (sem.isHoliday) return base + "bg-red-50 hover:bg-red-100";
  if (sem.isWeekend) return base + "bg-blue-50 hover:bg-blue-100";
  return base + apartmentColumnIdleClasses(aptName);
}

function bookedRangeCellClasses(
  day: string,
  booking: Booking,
  prevBooking: Booking | undefined,
  nextBooking: Booking | undefined,
): string {
  const samePrev = prevBooking && prevBooking.id === booking.id;
  const sameNext = nextBooking && nextBooking.id === booking.id;

  let s =
    "h-8 bg-green-500 hover:bg-green-600 text-white text-[10px] flex items-center justify-center px-0.5 min-w-0 overflow-hidden shadow-sm ";

  if (!samePrev) s += "border-t border-gray-200 ";
  if (!sameNext) s += "border-b border-gray-200 ";

  return s.trim();
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

export default function App() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [activeTab, setActiveTab] = useState<
    "calendar" | "apartments" | "events" | "bookings"
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
  } | null>(null);

  const [bookingModal, setBookingModal] = useState<{
    apartmentId: number;
    start: string;
    end: string;
    bookingId?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    guest_name: "",
    total_price: "",
    check_in_time: "",
    check_out_time: "",
  });

  const [sortField, setSortField] = useState<string>("check_in_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const popupRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const calendarAreaRef = useRef<HTMLDivElement | null>(null);

  function openBookingModalFromSelection(apartmentId: number) {
    if (!selection) return;
    if (selection.apartmentId !== apartmentId) return;
    const start =
      selection.start < selection.end ? selection.start : selection.end;
    const lastStay =
      selection.start > selection.end ? selection.start : selection.end;
    const checkOut = isoAddDays(lastStay, 1);
    setBookingModal({
      apartmentId,
      start,
      end: checkOut,
      bookingId: undefined,
    });
    setFormData({
      guest_name: "",
      total_price: "",
      check_in_time: "",
      check_out_time: "",
    });
    setContextMenu(null);
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

  const sortedBookings = useMemo(() => {
    if (!bookings) return null;
    const aptName = (id: number) =>
      apartments?.find((x) => x.id === id)?.name ?? String(id);
    const list = [...bookings];
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
        case "source":
        case "guests_count":
        case "owner_price":
        case "comment":
          cmp = 0;
          break;
        default:
          cmp = a.check_in_date.localeCompare(b.check_in_date);
      }
      if (sortDirection === "desc") cmp = -cmp;
      if (cmp === 0) cmp = a.id - b.id;
      return cmp;
    });
    return list;
  }, [bookings, apartments, sortField, sortDirection]);

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
      if (popupRef.current?.contains(t)) return;
      if (contextMenuRef.current?.contains(t)) return;
      setSelection(null);
    }

    document.addEventListener("mousedown", handleDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocMouseDown);
    };
  }, [bookingModal]);

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

  const calendarTodayKey = localTodayKey();

  return (
    <div className="min-h-screen bg-gray-200 flex">
      <div className="w-48 bg-white border-r p-4 space-y-2">
        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "calendar" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </div>

        <div
          className={
            "cursor-pointer p-2 rounded " +
            (activeTab === "apartments" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("apartments")}
        >
          Apartments
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
            (activeTab === "bookings" ? "bg-gray-200" : "")
          }
          onClick={() => setActiveTab("bookings")}
        >
          Бронирования
        </div>
      </div>

      <div className="flex-1 p-6 min-h-0 flex flex-col">
        <div className="max-w-2xl mx-auto min-h-0 flex flex-col flex-1 w-full">
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
                                  <React.Fragment key={day}>
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
                                      const booking = bookings?.find(
                                        (b) =>
                                          b.apartment_id === apt.id &&
                                          day >= b.check_in_date &&
                                          day < b.check_out_date,
                                      );
                                      const prevDay = isoAddDays(day, -1);
                                      const nextDay = isoAddDays(day, 1);

                                      const prevBooking = bookings?.find(
                                        (b) =>
                                          b.apartment_id === apt.id &&
                                          prevDay >= b.check_in_date &&
                                          prevDay < b.check_out_date,
                                      );

                                      const nextBooking = bookings?.find(
                                        (b) =>
                                          b.apartment_id === apt.id &&
                                          nextDay >= b.check_in_date &&
                                          nextDay < b.check_out_date,
                                      );
                                      const isBooked = booking !== undefined;
                                      const isStart =
                                        booking !== undefined &&
                                        day === booking.check_in_date;

                                      return (
                                        <div
                                          key={apt.id + "-" + day}
                                          className={
                                            (booking
                                              ? bookedRangeCellClasses(
                                                  day,
                                                  booking,
                                                  prevBooking,
                                                  nextBooking,
                                                ) + " cursor-pointer"
                                              : bookingCellClasses(sem, apt.name)) +
                                            (!booking
                                              ? " cursor-pointer hover:border-blue-400"
                                              : "") +
                                            (isInSelection(day, apt.id)
                                              ? " !bg-blue-200"
                                              : "")
                                          }
                                          onMouseDown={(e) => {
                                            if (e.button !== 0) return;
                                            if (isBooked) return;

                                            if (e.ctrlKey && selection) {
                                              if (selection.apartmentId !== apt.id)
                                                return;
                                              setSelection({
                                                ...selection,
                                                end: day,
                                              });
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

                                            setContextMenu({
                                              x: e.clientX,
                                              y: e.clientY,
                                              day,
                                              apartmentId: apt.id,
                                              isBooked,
                                            });
                                          }}
                                          onClick={(e) => {
                                            if (!booking) return;
                                            e.stopPropagation();
                                            setBookingModal({
                                              bookingId: booking.id,
                                              apartmentId: apt.id,
                                              start: booking.check_in_date,
                                              end: booking.check_out_date,
                                            });
                                            setFormData({
                                              guest_name: booking.guest_name ?? "",
                                              total_price:
                                                booking.total_price != null
                                                  ? String(booking.total_price)
                                                  : "",
                                              check_in_time:
                                                booking.check_in_time ?? "",
                                              check_out_time:
                                                booking.check_out_time ?? "",
                                            });
                                            setSelection(null);
                                            setContextMenu(null);
                                          }}
                                        >
                                          {isStart ? (
                                            <span
                                              className="truncate max-w-full text-center"
                                              title={booking.guest_name ?? ""}
                                            >
                                              {booking.guest_name ?? ""}
                                            </span>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                          </React.Fragment>
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
                  {!contextMenu.isBooked &&
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
                            contextMenu.day >= b.check_in_date &&
                            contextMenu.day < b.check_out_date,
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
                          .then(() => {
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
              {bookingModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-4 w-[300px]">
                    <div className="font-semibold mb-2">
                      {bookingModal.bookingId != null
                        ? "Редактировать бронь"
                        : "Создать бронь"}
                    </div>

                    <div className="text-sm mb-2">
                      {formatBookingRange(bookingModal.start, bookingModal.end)}
                    </div>

                    <div className="text-sm font-medium mb-1">
                      {formatDateRU(bookingModal.start)}
                    </div>
                    <input
                      type="date"
                      className="border p-1 w-full mb-2 text-gray-500 text-xs"
                      value={bookingModal.start}
                      onChange={(e) =>
                        setBookingModal((m) =>
                          m ? { ...m, start: e.target.value } : m,
                        )
                      }
                    />

                    <div className="text-xs text-gray-500 mb-1">
                      Время заезда {!formData.check_in_time && "—"}
                    </div>
                    <input
                      type="time"
                      className="border p-1 w-full mb-2"
                      value={formData.check_in_time || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, check_in_time: e.target.value })
                      }
                    />

                    <div className="text-sm font-medium mb-1">
                      {formatDateRU(bookingModal.end)}
                    </div>
                    <input
                      type="date"
                      className="border p-1 w-full mb-2 text-gray-500 text-xs"
                      value={bookingModal.end}
                      onChange={(e) =>
                        setBookingModal((m) =>
                          m ? { ...m, end: e.target.value } : m,
                        )
                      }
                    />

                    <div className="text-xs text-gray-500 mb-1">
                      Время выезда {!formData.check_out_time && "—"}
                    </div>
                    <input
                      type="time"
                      className="border p-1 w-full mb-2"
                      value={formData.check_out_time || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, check_out_time: e.target.value })
                      }
                    />

                    <input
                      placeholder="Имя гостя"
                      className="border p-1 w-full mb-2"
                      value={formData.guest_name}
                      onChange={(e) =>
                        setFormData({ ...formData, guest_name: e.target.value })
                      }
                    />

                    <input
                      placeholder="Сумма"
                      className="border p-1 w-full mb-2"
                      value={formData.total_price}
                      onChange={(e) =>
                        setFormData({ ...formData, total_price: e.target.value })
                      }
                    />

                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => setBookingModal(null)}>Отмена</button>
                      {bookingModal.bookingId != null && (
                        <button
                          type="button"
                          className="text-red-600 px-2 py-1"
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
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                        onClick={() => {
                          const payload = {
                            check_in_date: bookingModal.start,
                            check_out_date: bookingModal.end,
                            guest_name: formData.guest_name,
                            total_price: Number(formData.total_price || 0),
                            currency: "RUB",
                            check_in_time: formData.check_in_time.trim()
                              ? formData.check_in_time
                              : null,
                            check_out_time: formData.check_out_time.trim()
                              ? formData.check_out_time
                              : null,
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
              )}
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
              <div className="bg-white rounded-xl shadow p-4 max-w-full overflow-x-auto">
                {bookings === null || sortedBookings === null ? (
                  <p>Loading...</p>
                ) : (
                  <table className="w-full text-sm border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("check_in_date")}
                        >
                          check_in_date{sortHeaderArrow("check_in_date")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("check_out_date")}
                        >
                          check_out_date{sortHeaderArrow("check_out_date")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("apartment")}
                        >
                          apartment{sortHeaderArrow("apartment")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("source")}
                        >
                          source{sortHeaderArrow("source")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("guest_name")}
                        >
                          guest_name{sortHeaderArrow("guest_name")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("guests_count")}
                        >
                          guests_count{sortHeaderArrow("guests_count")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("owner_price")}
                        >
                          owner_price{sortHeaderArrow("owner_price")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("total_price")}
                        >
                          total_price{sortHeaderArrow("total_price")}
                        </th>
                        <th
                          className="py-2 pr-3 cursor-pointer font-medium whitespace-nowrap"
                          onClick={() => handleBookingsSort("comment")}
                        >
                          comment{sortHeaderArrow("comment")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBookings.map((b) => (
                        <tr key={b.id} className="border-b border-gray-100">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {b.check_in_date}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {b.check_out_date}
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {apartments?.find((a) => a.id === b.apartment_id)
                              ?.name ?? b.apartment_id}
                          </td>
                          <td className="py-2 pr-3 text-gray-400">—</td>
                          <td className="py-2 pr-3">{b.guest_name ?? "—"}</td>
                          <td className="py-2 pr-3 text-gray-400">—</td>
                          <td className="py-2 pr-3 text-gray-400">—</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {b.total_price ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-gray-400">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
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
        </div>
      </div>
    </div>
  );
}