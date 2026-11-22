import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "./table";

const meta: Meta<typeof Table> = {
  title: "UI/Table",
  // 説明ページは table.mdx に書くので、自動の説明ページは作らない
  tags: ["!autodocs"],
  component: Table,
  argTypes: {
    children: {
      control: false,
      description:
        "テーブルの中身。`TableHeader` と `TableBody` を渡す。例: `<TableBody><TableRow><TableCell>A-001</TableCell></TableRow></TableBody>`",
    },
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
type Story = StoryObj<typeof Table>;

const header = (
  <TableHeader>
    <TableRow>
      <TableHead>商品 ID</TableHead>
      <TableHead>商品名</TableHead>
      <TableHead numeric>数量</TableHead>
      <TableHead numeric>金額</TableHead>
    </TableRow>
  </TableHeader>
);

const empty = (
  <TableBody>
    <TableEmpty colSpan={4}>
      商品がありません。「新規商品を追加」から追加できます。
    </TableEmpty>
  </TableBody>
);

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      {header}
      <TableBody>
        <TableRow>
          <TableCell>A-001</TableCell>
          <TableCell>新刊</TableCell>
          <TableCell numeric>120</TableCell>
          <TableCell numeric>¥60,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>A-002</TableCell>
          <TableCell>既刊</TableCell>
          <TableCell numeric>8</TableCell>
          <TableCell numeric>¥4,000</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** 押すと詳細などが開く行（`interactive`）を含む */
export const WithRows: Story = {
  render: (args) => (
    <Table {...args}>
      {header}
      <TableBody>
        <TableRow interactive>
          <TableCell>A-001</TableCell>
          <TableCell>新刊</TableCell>
          <TableCell numeric>120</TableCell>
          <TableCell numeric>¥60,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>A-002</TableCell>
          <TableCell>既刊</TableCell>
          <TableCell numeric>8</TableCell>
          <TableCell numeric>¥4,000</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: (args) => (
    <Table {...args}>
      {header}
      {empty}
    </Table>
  ),
};

/** 読み込み中。行がないときの 1 行と同じ場所の中央にローダーを出す */
export const Loading: Story = {
  render: (args) => (
    <Table {...args}>
      {header}
      <TableBody>
        <TableLoading colSpan={4} />
      </TableBody>
    </Table>
  ),
};

/** 読み込み直しているテーブル。`reloading` を切り替えると、中身の行が薄くなり、ローダーが重なる */
export const Reloading: Story = {
  args: { reloading: true },
  render: (args) => (
    <Table {...args}>
      {header}
      <TableBody>
        <TableRow>
          <TableCell>A-001</TableCell>
          <TableCell>新刊</TableCell>
          <TableCell numeric>120</TableCell>
          <TableCell numeric>¥60,000</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>A-002</TableCell>
          <TableCell>既刊</TableCell>
          <TableCell numeric>8</TableCell>
          <TableCell numeric>¥4,000</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** 行のあるテーブルと、行のないテーブルを並べる */
export const All: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Table {...args}>
        {header}
        <TableBody>
          <TableRow interactive>
            <TableCell>A-001</TableCell>
            <TableCell>新刊</TableCell>
            <TableCell numeric>120</TableCell>
            <TableCell numeric>¥60,000</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Table {...args}>
        {header}
        {empty}
      </Table>
    </div>
  ),
};
