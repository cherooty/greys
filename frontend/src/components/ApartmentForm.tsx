import React from "react";

type ApartmentFormProps = {
  name: string;
  address: string;
  onChangeName: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeAddress: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function ApartmentForm({
  name,
  address,
  onChangeName,
  onChangeAddress,
  onSubmit,
}: ApartmentFormProps) {
  return (
    <div className="max-w-2xl mx-auto mt-6 p-4 border rounded-xl bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Add apartment</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label>
            <span className="text-sm font-medium mb-1 block">name</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={name}
              onChange={onChangeName}
            />
          </label>
        </div>
        <div>
          <label>
            <span className="text-sm font-medium mb-1 block">address</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={address}
              onChange={onChangeAddress}
            />
          </label>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-fit"
        >
          Create
        </button>
      </form>
    </div>
  );
}