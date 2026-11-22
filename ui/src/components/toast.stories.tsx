import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { useToast } from "./toast";

const meta: Meta = {
  title: "UI/Toast",
  // 説明ページは toast.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
};
export default meta;
type Story = StoryObj;

function ShowToastButton() {
  const { showToast } = useToast();
  return (
    <div className="p-4">
      <Button onClick={() => showToast("発注を登録しました。")}>トーストを出す</Button>
    </div>
  );
}

/** 押すとトーストが出る。続けて押すと、重なって表示される */
export const Default: Story = {
  render: () => <ShowToastButton />,
};
