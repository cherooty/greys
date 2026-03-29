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
    <div className="max-w-2xl mx-auto mt-6 space-y-4">
      <ul>
        {apartments.map((a) => (
          <li
            key={a.id}
            className="border rounded-xl p-4 shadow-sm bg-white flex justify-between items-center hover:shadow-md transition"
          >
            {editingId === a.id ? (
              <form
                onSubmit={onSaveEdit}
                className="flex flex-wrap items-center gap-2 w-full justify-between"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="border rounded px-2 py-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="border rounded px-2 py-1"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
              </form>
            ) : (
              <>
                <div className="flex flex-col">
                  <div className="font-semibold text-lg">{a.name}</div>
                  {a.address ? (
                    <div className="text-sm text-gray-500">{a.address}</div>
                  ) : null}
                </div>
                <div>
                  <button
                    type="button"
                    className="text-blue-600 hover:underline mr-3"
                    onClick={() => onStartEdit(a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => onDelete(a.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}