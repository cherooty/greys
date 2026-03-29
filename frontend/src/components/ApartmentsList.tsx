import React from "react";

export type Apartment = {
  id: number;
  name: string;
  address?: string | null;
};

type ApartmentsListProps = {
  apartments: Apartment[];
  editingId: number | null;
  editName: string;
  editAddress: string;
  onStartEdit: (apartment: Apartment) => void;
  onSaveEdit: (e: React.FormEvent) => void;
  onDelete: (id: number) => void;
  setEditName: React.Dispatch<React.SetStateAction<string>>;
  setEditAddress: React.Dispatch<React.SetStateAction<string>>;
};

export function ApartmentsList({
  apartments,
  editingId,
  editName,
  editAddress,
  onStartEdit,
  onSaveEdit,
  onDelete,
  setEditName,
  setEditAddress,
}: ApartmentsListProps) {
  return (
    <ul>
      {apartments.map((a) => (
        <li key={a.id}>
          {editingId === a.id ? (
            <form onSubmit={onSaveEdit}>
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
              <button type="button" onClick={() => onStartEdit(a)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(a.id)}>
                Delete
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
