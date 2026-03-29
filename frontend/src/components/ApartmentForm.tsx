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
    <form onSubmit={onSubmit}>
      <div>
        <label>
          name{" "}
          <input value={name} onChange={onChangeName} />
        </label>
      </div>
      <div>
        <label>
          address{" "}
          <input value={address} onChange={onChangeAddress} />
        </label>
      </div>
      <button type="submit">Create</button>
    </form>
  );
}
