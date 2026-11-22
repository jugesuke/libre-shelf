import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoaderCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { Page } from "../../components/page";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading as TableLoadingRow,
  TableRow,
} from "../../components/table";

const meta: Meta = {
  title: "デザインパターン/読み込み中と処理中",
  tags: ["!autodocs"],
};
export default meta;
type Story = StoryObj;

const loader = (
  <LoaderCircle
    aria-label="読み込み中"
    strokeWidth={2.5}
    className="mx-auto size-5 animate-spin"
  />
);

/**
 * 処理中のボタン。`Button` の `loading` を使う
 */
function ProcessingButtonDemo() {
  const [processing, setProcessing] = useState(false);
  const start = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000);
  };
  return (
    <div className="flex items-center gap-3 p-4">
      <Button>やめる</Button>
      <Button variant="primary" onClick={start} loading={processing}>
        登録
      </Button>
    </div>
  );
}

/** 「登録」を押すと、2 秒間処理中になる */
export const ProcessingButton: Story = {
  name: "処理中のボタン",
  render: () => <ProcessingButtonDemo />,
};

function OrderTable({
  body,
  reloading,
}: {
  body: ReactNode;
  reloading?: boolean;
}) {
  return (
    <Table reloading={reloading}>
      <TableHeader>
        <TableRow>
          <TableHead>商品名</TableHead>
          <TableHead numeric>注文数量</TableHead>
          <TableHead numeric>総額</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{body}</TableBody>
    </Table>
  );
}

function orderRows(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <TableRow key={i}>
      <TableCell>みほん同人誌 {i + 1}</TableCell>
      <TableCell numeric>100</TableCell>
      <TableCell numeric>¥10,000</TableCell>
    </TableRow>
  ));
}

/** テーブルの読み込み中。行がないときの 1 行と同じ場所の中央にローダーを出す */
export const TableLoading: Story = {
  name: "テーブルの読み込み中",
  render: () => (
    <div className="flex flex-col gap-6 p-4">
      <Card title="読み込み中">
        <OrderTable body={<TableLoadingRow colSpan={3} />} />
      </Card>
      <Card title="行がないとき">
        <OrderTable
          body={
            <TableEmpty colSpan={3}>
              発注がありません。「新規発注を登録」から登録できます。
            </TableEmpty>
          }
        />
      </Card>
    </div>
  ),
};

function PageLoadDemo() {
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <Button onClick={load}>読み込む</Button>
      </div>
      <div className="border-border rounded-md border">
        <Page title="即売会の結果">
          {loading ? (
            <div className="text-muted-foreground flex h-5 items-center justify-center">
              {loader}
            </div>
          ) : (
            <Card title="総売上">
              <p className="text-2xl font-bold">¥12,000</p>
            </Card>
          )}
        </Page>
      </div>
    </div>
  );
}

/** テーブル以外の読み込み中。「読み込む」を押すと、1.5 秒間読み込み中になる */
export const NonTableLoading: Story = {
  name: "テーブル以外の読み込み中",
  render: () => <PageLoadDemo />,
};

function ReloadDemo() {
  const [count, setCount] = useState(3);
  const [reloading, setReloading] = useState(false);
  const reload = () => {
    setReloading(true);
    setTimeout(() => {
      setCount((c) => (c >= 6 ? 3 : c + 1));
      setReloading(false);
    }, 1500);
  };
  return (
    <div className="p-4">
      <Card title="発注" actions={<Button onClick={reload}>再読み込み</Button>}>
        <OrderTable body={orderRows(count)} reloading={reloading} />
      </Card>
    </div>
  );
}

/** 読み込み直すとき。「再読み込み」を押すと、1.5 秒後に 1 行増えた中身に入れ替わる（6 行の次は 3 行に戻る） */
export const Reload: Story = {
  name: "読み込み直すとき",
  render: () => <ReloadDemo />,
};
