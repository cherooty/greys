import React, { useEffect, useState } from "react";

type Apartment = {
  id: number;
  name: string;
  address?: string | null;
};

export default function App() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [apartments, setApartments] = useState<Apartment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("http://localhost:8000/api/apartments")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setApartments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setApartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const body: { name: string; address?: string | null } = { name: trimmed };
    const addr = address.trim();
    if (addr) body.address = addr;

    fetch("http://localhost:8000/api/apartments/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create");
        return res.json();
      })
      .then((created: Apartment) => {
        setName("");
        setAddress("");
        setApartments((prev) =>
          prev === null ? [created] : [...prev, created],
        );
      })
      .catch(() => { });
  }

  function handleDelete(id: number) {
    fetch(`http://localhost:8000/api/apartments/${id}/`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        setApartments((prev) =>
          prev === null ? prev : prev.filter((a) => a.id !== id),
        );
      })
      .catch(() => {});
  }

  function handleStartEdit(apartment: Apartment) {
    setEditingId(apartment.id);
    setEditName(apartment.name);
    setEditAddress(apartment.address ?? "");
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    const body = {
      name: trimmed,
      address: editAddress.trim() || null,
    };

    fetch(`http://localhost:8000/api/apartments/${editingId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      })
      .then((updated: Apartment) => {
        setApartments((prev) =>
          prev === null ? prev : prev.map((x) => (x.id === updated.id ? updated : x)),
        );
        setEditingId(null);
      })
      .catch(() => {});
  }

  return (
    <>
      <h1>Apartments</h1>
      <form onSubmit={handleCreate}>
        <div>
          <label>
            name{" "}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <div>
          <label>
            address{" "}
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Create</button>
      </form>
      {apartments === null ? (
        <p>Loading...</p>
      ) : apartments.length === 0 ? (
        <p>No apartments</p>
      ) : (
        <ul>
          {apartments.map((a) => (
            <li key={a.id}>
              {editingId === a.id ? (
                <form onSubmit={handleSaveEdit}>
                  <div>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>
                  <button type="submit">Save</button>
                </form>
              ) : (
                <>
                  <div>{a.name}</div>
                  {a.address ? <div>{a.address}</div> : null}
                  <button type="button" onClick={() => handleStartEdit(a)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(a.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
