import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Card } from "../../components/card";
import { Page } from "../../components/page";
import { Table, TableBody, TableEmpty, TableHead, TableHeader, TableRow } from "../../components/table";

const meta: Meta = {
  title: "デザインパターン/何もないとき",
  tags: ["!autodocs"],
};
export default meta;
type Story = StoryObj;

/** テーブルに行が 1 つもないときは、見出しの行を表示し、テーブルの中の 1 行に文言を書く */
export const EmptyTable: Story = {
  name: "テーブル",
  render: () => (
    <Page title="発注一覧">
      <div className="flex flex-col gap-4">
        <Card title="新規発注を登録" collapsible open={false} onOpenChange={() => {}}>
          {null}
        </Card>
        <Table>
          <TableHeader>
            <TableRow>
              {["商品名", "注文数量", "総額（税込）", "注文日時"].map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmpty colSpan={4}>発注がありません。「新規発注を登録」から登録できます。</TableEmpty>
          </TableBody>
        </Table>
      </div>
    </Page>
  ),
};

/** 終わった即売会の記録のように、これから足せないものは、何がなかったかを過去の形で書く */
export const EmptyPastRecord: Story = {
  name: "テーブル（終わった即売会の記録）",
  render: () => (
    <Page title="即売会の結果">
      <Card title="商品別売上">
        <Table>
          <TableHeader>
            <TableRow>
              {["商品名", "販売数", "売上"].map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmpty colSpan={3}>販売記録がありませんでした。</TableEmpty>
          </TableBody>
        </Table>
      </Card>
    </Page>
  ),
};

/** カードの並びに 1 つもないときは、カード 1 枚と同じ高さ（48px）の枠に文言を書く */
export const EmptyCardList: Story = {
  name: "カードの並び",
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex h-12 items-center justify-center rounded-md border border-border px-4 text-center text-sm text-muted-foreground">
        ロケーションがありません。「新規ロケーションを追加」から追加できます。
      </div>
    </div>
  ),
};

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

/** グラフの場所に文言を書く。高さはグラフと同じにする */
function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md bg-surface-muted px-4 text-center text-sm text-muted-foreground"
      style={{ height }}
    >
      まだ会計記録がありません。レジで会計すると表示されます。
    </div>
  );
}

/** 集計に元のデータがないときは、集計の形を残し、数を 0 にして、グラフの場所に文言を書く */
export const EmptySummary: Story = {
  name: "集計",
  render: () => (
    <div className="p-4">
      <Card className="max-w-xl">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">総売上</p>
            <p className="text-4xl font-bold">¥0</p>
          </div>
          <SummarySection title="商品別頒布数">
            <EmptyChart height={76} />
          </SummarySection>
          <SummarySection title="時間別頒布冊数（30分刻み）">
            <EmptyChart height={160} />
          </SummarySection>
        </div>
      </Card>
    </div>
  ),
};
