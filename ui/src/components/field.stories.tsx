import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { Select } from "./select";
import { Textarea } from "./textarea";

const meta: Meta<typeof Field> = {
  title: "UI/Field",
  // 説明ページは field.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Field,
  argTypes: {
    children: { control: false, description: "入力欄。例: `<Input placeholder=\"例: 100\" />`" },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  args: { label: "注文数量", children: <Input placeholder="例: 100" /> },
};
export const Required: Story = {
  args: { label: "注文数量", required: true, children: <Input placeholder="例: 100" /> },
};
export const WithError: Story = {
  args: { label: "注文数量", required: true, error: "1 以上の数を入力してください", children: <Input defaultValue="0" /> },
};
export const WithSelect: Story = {
  args: {
    label: "ロケーション",
    children: (
      <Select>
        <option>倉庫</option>
        <option>会場</option>
      </Select>
    ),
  },
};
export const WithTextarea: Story = {
  args: { label: "メモ", children: <Textarea /> },
};
export const WithYen: Story = {
  args: {
    label: "総額（税込）",
    controlId: "cost-total",
    children: (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">¥</span>
        <Input id="cost-total" type="number" min={0} defaultValue="1000" />
      </div>
    ),
  },
};
export const WithCount: Story = {
  args: {
    label: "注文数量",
    controlId: "ordered-quantity",
    children: (
      <div className="flex items-center gap-1">
        <Input id="ordered-quantity" type="number" min={0} defaultValue="100" />
        <span className="text-muted-foreground">冊</span>
      </div>
    ),
  },
};
export const DisabledInput: Story = {
  args: { label: "注文数量", children: <Input disabled defaultValue="100" /> },
};

export const WithControlId: Story = {
  args: {
    label: "商品",
    required: true,
    controlId: "item-control",
    describedById: "item-control-error",
    error: "商品が登録されていません",
    children: (
      <div data-testid="combined" className="flex gap-2">
        <Input id="item-control" aria-describedby="item-control-error" aria-invalid className="min-w-0 flex-1" />
        <Button>追加</Button>
      </div>
    ),
  },
};

/** 欄の種類と、必須、エラー、使えない状態を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Field {...args} label="注文数量">
        <Input placeholder="例: 100" />
      </Field>
      <Field {...args} label="注文数量" required>
        <Input placeholder="例: 100" />
      </Field>
      <Field {...args} label="注文数量" required error="1 以上の数を入力してください">
        <Input defaultValue="0" />
      </Field>
      <Field {...args} label="ロケーション">
        <Select>
          <option>倉庫</option>
          <option>会場</option>
        </Select>
      </Field>
      <Field {...args} label="メモ">
        <Textarea />
      </Field>
      <Field {...args} label="注文数量">
        <Input disabled defaultValue="100" />
      </Field>
    </div>
  ),
};
