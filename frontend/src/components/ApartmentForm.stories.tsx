import type { Meta, StoryObj } from "@storybook/react";
import { ApartmentForm } from "./ApartmentForm";

const meta: Meta<typeof ApartmentForm> = {
  title: "Components/ApartmentForm",
  component: ApartmentForm,
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-200 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ApartmentForm>;

export const Default: Story = {
  args: {
    name: "Семеновские",
    address: "Коваленко, 3",
    onChangeName: () => {},
    onChangeAddress: () => {},
    onSubmit: (e) => e.preventDefault(),
  },
};
