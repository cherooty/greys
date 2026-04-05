import React, { useEffect, useState } from "react";
import { ApartmentForm } from "./components/ApartmentForm";
import { ApartmentsList, type Apartment } from "./components/ApartmentsList";

type Booking = {
  id: number;
  apartment_id: number;
  check_in_date: string;
  check_out_date: string;
};

export default function App() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

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

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="min-h-screen bg-gray-200 py-8">
      <div className="max-w-2xl mx-auto px-4">
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

        <h2 className="text-xl font-semibold mt-10 mb-4">Bookings</h2>

        {bookings === null ? (
          <p>Loading...</p>
        ) : (
          apartments &&
          bookings && (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[150px_repeat(7,1fr)] gap-1 text-sm">
                <div />
                {days.map((day) => (
                  <div key={day} className="text-center font-medium">
                    {day.slice(5)}
                  </div>
                ))}

                {apartments.map((apt) => {
                  const aptBookings = bookings.filter(
                    (b) => b.apartment_id === apt.id,
                  );

                  return (
                    <React.Fragment key={apt.id}>
                      <div className="font-semibold">{apt.name}</div>

                      {days.map((day) => {
                        const isBooked = aptBookings.some(
                          (b) =>
                            day >= b.check_in_date && day < b.check_out_date,
                        );

                        return (
                          <div
                            key={day}
                            className={
                              "h-8 border " +
                              (isBooked ? "bg-blue-400" : "bg-white")
                            }
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}