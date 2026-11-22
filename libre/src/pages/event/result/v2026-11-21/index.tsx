import { formatYen } from "@libre/common/format";
import { useState } from "react";
import { resultProductName } from "@libre/common/event-session/menu-entry";
import type { EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { EventSummaryContent } from "./summary-content";
import { ConsignmentSummary } from "@libre/common/event-session/ConsignmentSummary";
import type { EventResultBodyProps } from "../result-props";
import { buildChangeReview } from "./change-review-view";
import { Card } from "@shelf/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";

function EventResultV20261121({ sessionJson }: EventResultBodyProps) {
  const [session] = useState<EventSessionV20261121>(
    () => JSON.parse(sessionJson) as EventSessionV20261121,
  );
  const activeTx = session.transactions.filter((t) => !t.cancelled);
  const totalSales = activeTx.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0,
  );

  const itemSalesMap = new Map<
    string,
    { price: number; quantity: number; total: number }
  >();
  for (const tx of activeTx) {
    for (const item of tx.items) {
      const prev = itemSalesMap.get(item.itemId) ?? {
        price: item.price,
        quantity: 0,
        total: 0,
      };
      itemSalesMap.set(item.itemId, {
        price: item.price,
        quantity: prev.quantity + item.quantity,
        total: prev.total + item.price * item.quantity,
      });
    }
  }
  const itemSalesRows = Array.from(itemSalesMap.entries())
    .map(([itemId, d]) => ({ itemId, ...d }))
    .sort((a, b) => b.total - a.total);

  const acquaintanceCount = activeTx.filter(
    (t) => t.buyerType === "acquaintance",
  ).length;
  const strangerCount = activeTx.filter(
    (t) => t.buyerType === "stranger",
  ).length;
  const acquaintanceSales = activeTx
    .filter((t) => t.buyerType === "acquaintance")
    .reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0,
    );
  const strangerSales = activeTx
    .filter((t) => t.buyerType === "stranger")
    .reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0,
    );
  const totalCount = acquaintanceCount + strangerCount;
  const changeReview = buildChangeReview(session);
  const itemName = (itemId: string) =>
    resultProductName(session.menu, session.transactions, itemId);

  return (
    <div className="flex flex-col gap-4">
      {/* 総売上 */}
      <Card title="総売上">
        <p className="text-4xl font-bold">{formatYen(totalSales)}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {totalCount} 件のトランザクション
        </p>
      </Card>

      {/* 商品別売上（表） */}
      <Card title="商品別売上">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名</TableHead>
              <TableHead numeric>単価</TableHead>
              <TableHead numeric>販売数</TableHead>
              <TableHead numeric>売上</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemSalesRows.length === 0 ? (
              <TableEmpty colSpan={4}>販売記録がありませんでした。</TableEmpty>
            ) : (
              itemSalesRows.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell className="font-bold">
                    {itemName(item.itemId)}
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {formatYen(item.price)}
                  </TableCell>
                  <TableCell numeric>{item.quantity}冊</TableCell>
                  <TableCell numeric className="font-bold">
                    {formatYen(item.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 委託販売サマリー（委託物がないセッションでは非表示） */}
      <ConsignmentSummary
        session={session}
        itemName={itemName}
        variant="card"
      />

      {/* 購入者属性（カード） */}
      <Card title="購入者属性">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-muted rounded-md p-4">
            <p className="flex items-center gap-1 text-sm font-bold">
              <span
                aria-hidden="true"
                className="bg-primary size-2.5 rounded-sm"
              />
              知り合い以外
            </p>
            <p className="mt-1 text-2xl font-bold">{strangerCount}件</p>
            <p className="text-sm">{formatYen(strangerSales)}</p>
            {totalCount > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                {Math.round((strangerCount / totalCount) * 100)}%
              </p>
            )}
          </div>
          <div className="bg-surface-muted rounded-md p-4">
            <p className="flex items-center gap-1 text-sm font-bold">
              <span
                aria-hidden="true"
                className="bg-info size-2.5 rounded-sm"
              />
              知り合い
            </p>
            <p className="mt-1 text-2xl font-bold">{acquaintanceCount}件</p>
            <p className="text-sm">{formatYen(acquaintanceSales)}</p>
            {totalCount > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                {Math.round((acquaintanceCount / totalCount) * 100)}%
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* グラフ */}
      <Card title="グラフ">
        <EventSummaryContent
          session={session}
          itemName={itemName}
          finished
        />
      </Card>

      {/* お釣りの振り返り */}
      <Card title="お釣りの振り返り">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-sm">
            {changeReview.conclusion.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            お釣りは、足りるときは最少枚数で渡したとして計算しています。
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>金種</TableHead>
                <TableHead numeric>用意した</TableHead>
                <TableHead numeric>受け取った</TableHead>
                <TableHead numeric>お釣りに出た</TableHead>
                <TableHead numeric>必要だった枚数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changeReview.rows.map((row) => (
                <TableRow
                  key={row.label}
                  className={row.mismatch ? "bg-warning-muted" : undefined}
                >
                  <TableCell className="font-bold">{row.label}</TableCell>
                  <TableCell numeric>{row.opening}</TableCell>
                  <TableCell numeric>{row.tendered}</TableCell>
                  <TableCell numeric>{row.changeCount}</TableCell>
                  <TableCell numeric>{row.required}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {changeReview.mismatches.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <h3 className="text-muted-foreground text-sm font-bold">
                記録と合わなかった金種
              </h3>
              {changeReview.mismatches.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="text-muted-foreground text-sm">
                色の付いた行は、足りたかと必要だった枚数が不正確なことがあります。
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default EventResultV20261121;
