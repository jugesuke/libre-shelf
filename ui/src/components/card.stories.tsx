import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { Button } from "./button";
import { Card } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  // 説明ページは card.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Card,
  args: { onOpenChange: fn() },
  argTypes: {
    children: { control: false, description: "カードの中身。要素を渡す。例: `<p>中身</p>`" },
    actions: { control: false, description: "ヘッダーの右に置く操作。ボタンなどを渡す。例: `<Button>編集</Button>`" },
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
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { children: <p>中身</p> },
};

export const WithHeader: Story = {
  args: {
    title: "在庫",
    actions: <Button>編集</Button>,
    children: <p>中身</p>,
  },
};

export const WithDescription: Story = {
  args: {
    title: "在庫",
    description: "補足の文",
    children: <p>中身</p>,
  },
};

export const WithoutHeader: Story = {
  args: { children: <p>中身</p> },
};

/** `title` がないときは、`description` と `actions` を渡しても表示しない */
export const WithoutHeaderIgnoresExtras: Story = {
  args: { description: "補足の文", actions: <Button>編集</Button>, children: <p>中身</p> },
};

/** 折りたためるカードを、操作に合わせて `open` を書き換えて表示する */
const renderCollapsible: Story["render"] = (args) => {
  const [, updateArgs] = useArgs();
  return (
    <Card
      {...args}
      collapsible
      title={args.title ?? ""}
      open={args.open === true}
      onOpenChange={(open) => {
        args.onOpenChange?.(open);
        updateArgs({ open });
      }}
    />
  );
};

/** 開閉の状態を持つ折りたためるカード。閉じた状態から始める。 */
export const Collapsible: Story = {
  args: { title: "新規商品を追加", collapsible: true, open: false, children: <p>中身</p> },
  render: renderCollapsible,
};

export const CollapsibleWithActions: Story = {
  args: {
    title: "新規商品を追加",
    actions: <Button>編集</Button>,
    collapsible: true,
    open: false,
    children: <p>中身</p>,
  },
  render: renderCollapsible,
};

export const CollapsibleWithRichTitle: Story = {
  args: {
    title: "新規商品を追加",
    description: "補足の文",
    actions: <Button>編集</Button>,
    collapsible: true,
    open: false,
    children: <p>中身</p>,
  },
  render: renderCollapsible,
};

/** 見出しの有無と、折りたためるカードの開閉を並べる */
export const All: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Card title="在庫" actions={<Button>編集</Button>}>
        <p>中身</p>
      </Card>
      <Card>
        <p>中身</p>
      </Card>
      <Card title="新規商品を追加" collapsible open={false} onOpenChange={fn()}>
        <p>中身</p>
      </Card>
      <Card title="新規商品を追加" collapsible open onOpenChange={fn()}>
        <p>中身</p>
      </Card>
    </div>
  ),
};
