import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Input } from "./input";
import { Field } from "./field";
import { Page } from "./page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta: Meta<typeof Page> = {
  title: "UI/Page",
  // 説明ページは page.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Page,
  argTypes: { width: { control: "inline-radio", options: ["wide", "narrow"] } },
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Page>;

const list = (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>商品 ID</TableHead>
        <TableHead>商品名</TableHead>
        <TableHead numeric>数量</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>A-001</TableCell>
        <TableCell>新刊</TableCell>
        <TableCell numeric>120</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>A-002</TableCell>
        <TableCell>既刊</TableCell>
        <TableCell numeric>8</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

const form = (
  <Field label="開始時レジ金" required>
    <Input />
  </Field>
);

/** `width` を省いた見本。`wide` と同じ幅になる */
export const Default: Story = {
  args: {
    title: "商品一覧",
    actions: <Button>＋ 新規商品を追加</Button>,
    children: list,
  },
};

/** 一覧の画面の見本。`width` を指定する */
export const Wide: Story = {
  args: {
    title: "商品一覧",
    width: "wide",
    actions: <Button>＋ 新規商品を追加</Button>,
    children: list,
  },
};

/** フォームの画面の見本 */
export const Narrow: Story = {
  args: {
    title: "前日準備",
    width: "narrow",
    children: form,
  },
};

/** 幅ごとの見本を並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col divide-y divide-border">
      <Page {...args} title="商品一覧" width="wide" actions={<Button>＋ 新規商品を追加</Button>}>
        {list}
      </Page>
      <Page {...args} title="前日準備" width="narrow">
        {form}
      </Page>
    </div>
  ),
};
