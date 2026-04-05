import React, { useEffect, useMemo, useState } from "react";
import { ApartmentForm } from "./components/ApartmentForm";
import { ApartmentsList, type Apartment } from "./components/ApartmentsList";

type Booking = {
  id: number;
  apartment_id: number;
  check_in_date: string;
  check_out_date: string;
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

function bookingCellClasses(
  isBooked: boolean,
  sem: DaySemantics,
  aptName: string,
): string {
  const base = "h-8 border border-gray-200 ";
  if (isBooked) return base + "bg-green-500 rounded-md hover:bg-green-600";
  if (sem.isHoliday) return base + "bg-red-50 hover:bg-red-100";
  if (sem.isWeekend) return base + "bg-blue-50 hover:bg-blue-100";
  return base + apartmentColumnIdleClasses(aptName);
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
    "calendar" | "apartments" | "events"
  >("calendar");

  const [enabledEvents, setEnabledEvents] = useState<Record<string, boolean>>(
    {},
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    events.forEach((e) => {
      if (enabledEvents[e.id] === false) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [enabledEvents]);

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
      </div>

      <div className="flex-1 p-6 min-h-0 flex flex-col">
        <div className="max-w-2xl mx-auto min-h-0 flex flex-col flex-1 w-full">
          {activeTab === "calendar" && (
            <>
              <h2 className="text-xl font-semibold mb-4 shrink-0">Bookings</h2>

              {bookings === null ? (
                <p>Loading...</p>
              ) : (
                apartments &&
                bookings && (
                  <div className="bg-white rounded-xl shadow p-4 flex-1 min-h-[12rem] min-w-0 flex flex-col max-h-[calc(100vh-10rem)]">
                    <div className="overflow-auto flex-1 min-h-0 -mx-1 px-1">
                      <div
                        className="grid gap-1 text-sm min-w-max"
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
                                      onClick={() => {
                                        if (eventsByDate[day]) {
                                          setSelectedDate(day);
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
                                      const aptBookings = bookings.filter(
                                        (b) => b.apartment_id === apt.id,
                                      );

                                      const isBooked = aptBookings.some(
                                        (b) =>
                                          day >= b.check_in_date &&
                                          day < b.check_out_date,
                                      );

                                      return (
                                        <div
                                          key={apt.id + "-" + day}
                                          className={bookingCellClasses(
                                            isBooked,
                                            sem,
                                            apt.name,
                                          )}
                                        />
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
                )
              )}
              {selectedDate && (
                <div className="fixed left-20 top-20 bg-white border shadow-lg rounded p-3 z-50">
                  <div className="font-semibold mb-2">
                    {formatDay(selectedDate)}
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    {eventsByDate[selectedDate]?.map((e) => (
                      <div key={e.id}>{e.title}</div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600"
                    onClick={() => setSelectedDate(null)}
                  >
                    Закрыть
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "events" && (
            <>
              <h2 className="text-xl font-semibold mb-4">События</h2>
              <div className="bg-white rounded-xl shadow p-4 space-y-2 max-w-lg">
                {events.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 cursor-pointer"
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
                    <span>
                      {e.title} ({e.date})
                    </span>
                  </label>
                ))}
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