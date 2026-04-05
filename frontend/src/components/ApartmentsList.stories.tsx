import type { Meta, StoryObj } from "@storybook/react";
import { ApartmentsList, type Apartment } from "./ApartmentsList";

const meta: Meta<typeof ApartmentsList> = {
  title: "Components/ApartmentsList",
  component: ApartmentsList,
};

export default meta;

type Story = StoryObj<typeof ApartmentsList>;

const mockApartments: Apartment[] = [
  { id: 1, name: "Apartment 1", address: "Riga center" },
  { id: 2, name: "Apartment 2", address: "Old town" },
];

export const Default: Story = {
  args: {
    apartments: mockApartments,
    editingId: null,
    editName: "",
    editAddress: "",
    onStartEdit: () => {},
    onSaveEdit: () => {},
    onDelete: () => {},
    setEditName: () => {},
    setEditAddress: () => {},
  },
};

export const Empty: Story = {
  args: {
    apartments: [],
    editingId: null,
    editName: "",
    editAddress: "",
    onStartEdit: () => {},
    onSaveEdit: () => {},
    onDelete: () => {},
    setEditName: () => {},
    setEditAddress: () => {},
  },
};

export const Editing: Story = {
  args: {
    apartments: mockApartments,
    editingId: 1,
    editName: "Apartment 1",
    editAddress: "Riga center",
    onStartEdit: () => {},
    onSaveEdit: () => {},
    onDelete: () => {},
    setEditName: () => {},
    setEditAddress: () => {},
  },
};
