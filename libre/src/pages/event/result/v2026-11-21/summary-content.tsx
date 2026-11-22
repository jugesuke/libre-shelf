import { formatYen } from "@libre/common/format";
import { parseSessionTime } from "@libre/common/event-session/session-time";
import { EmptyEventSummary } from "../empty-summary";
import {
  isConsignedItem,
  type EventSessionV20261121,
} from "@libre-shared/entity/event/v2026-11-21/event-session";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  session: Pick<EventSessionV20261121, "menu" | "transactions">;
  /** 商品名の解決関数。呼び出し元によって商品名の出どころが違うため引数で受け取る */
  itemName: (itemId: string) => string;
  finished: boolean;
};

const C = {
  rose: "var(--primary)",
  sky: "var(--info)",
};

const LINE_COLORS = [
  "var(--primary)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--chart-3)",
  "var(--chart-2)",
];

export function EventSummaryContent({ session, itemName, finished }: Props) {
  const activeTx = session.transactions.filter((t) => !t.cancelled);
  const totalSales = activeTx.reduce(
    (sum, t) => sum + t.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0,
  );

  // 委託元名（おしながきに載っていない商品は自サークル頒布物として扱う）
  const consignorNameMap = new Map(
    session.menu
      .filter(isConsignedItem)
      .map((e) => [e.itemId, e.consignorName]),
  );

  // 自サークル分・委託分の売上内訳
  const ownSales = activeTx.reduce(
    (sum, t) =>
      sum +
      t.items
        .filter((i) => !consignorNameMap.has(i.itemId))
        .reduce((s, i) => s + i.price * i.quantity, 0),
    0,
  );
  const consignedSales = totalSales - ownSales;

  // 商品別売上
  const itemSalesMap = new Map<string, { revenue: number; count: number }>();
  for (const tx of activeTx) {
    for (const item of tx.items) {
      const prev = itemSalesMap.get(item.itemId) ?? { revenue: 0, count: 0 };
      itemSalesMap.set(item.itemId, {
        revenue: prev.revenue + item.price * item.quantity,
        count: prev.count + item.quantity,
      });
    }
  }
  const itemSalesData = Array.from(itemSalesMap.entries()).map(
    ([itemId, d]) => {
      const consignorName = consignorNameMap.get(itemId);
      const productName = itemName(itemId);
      return {
        name: consignorName
          ? `${productName}（委託: ${consignorName}）`
          : productName,
        売上高: d.revenue,
        冊数: d.count,
      };
    },
  );

  // 購入者内訳
  const acquaintanceCount = activeTx.filter(
    (t) => t.buyerType === "acquaintance",
  ).length;
  const strangerCount = activeTx.filter(
    (t) => t.buyerType === "stranger",
  ).length;

  // 時間別頒布冊数（30分刻み・アイテム別）
  const timeItemBuckets = new Map<string, Map<string, number>>();
  for (const tx of activeTx) {
    const d = new Date(parseSessionTime(tx.occurredAt));
    const key = `${String(d.getHours()).padStart(2, "0")}:${d.getMinutes() < 30 ? "00" : "30"}`;
    if (!timeItemBuckets.has(key)) timeItemBuckets.set(key, new Map());
    const bucket = timeItemBuckets.get(key)!;
    for (const item of tx.items) {
      bucket.set(item.itemId, (bucket.get(item.itemId) ?? 0) + item.quantity);
    }
  }
  const timeItemIds = Array.from(
    new Set(activeTx.flatMap((t) => t.items.map((i) => i.itemId))),
  );
  const timeData = Array.from(timeItemBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, bucket]) => {
      const itemCounts = Object.fromEntries(
        timeItemIds.map((id) => [id, bucket.get(id) ?? 0]),
      );
      const total = Object.values(itemCounts).reduce((s, n) => s + n, 0);
      return { time, __total__: total, ...itemCounts };
    });

  if (activeTx.length === 0) {
    return <EmptyEventSummary finished={finished} />;
  }

  return (
    <div className="space-y-6">
      {/* 総売上 */}
      <div className="text-center">
        <div className="text-muted-foreground text-sm">総売上</div>
        <div className="text-primary text-4xl font-bold">
          {formatYen(totalSales)}
        </div>
        <div className="text-muted-foreground text-sm">{activeTx.length}件</div>
        {consignedSales > 0 && (
          <div className="mt-2 flex justify-center gap-6 text-sm">
            <div>自サークル分 {formatYen(ownSales)}</div>
            <div>委託分 {formatYen(consignedSales)}</div>
          </div>
        )}
      </div>

      {/* 購入者内訳 */}
      {(strangerCount > 0 || acquaintanceCount > 0) && (
        <section>
          <h3 className="mb-2 text-sm font-bold">購入者内訳</h3>
          <ResponsiveContainer width="100%" height={40}>
            <BarChart
              data={[
                { 知り合い以外: strangerCount, 知り合い: acquaintanceCount },
              ]}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" hide />
              <Tooltip formatter={(v, name) => [`${Number(v)}件`, name]} />
              <Bar
                dataKey="知り合い以外"
                fill={C.rose}
                stackId="a"
                radius={[4, 0, 0, 4]}
              />
              <Bar
                dataKey="知り合い"
                fill={C.sky}
                stackId="a"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: C.rose }}
              />
              知り合い以外: {strangerCount}件
            </div>
            <div className="flex items-center gap-1">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: C.sky }}
              />
              知り合い: {acquaintanceCount}件
            </div>
          </div>
        </section>
      )}

      {/* 商品別売上 */}
      {itemSalesData.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold">商品別売上</h3>
          <ResponsiveContainer
            width="100%"
            height={itemSalesData.length * 44 + 32}
          >
            <BarChart
              data={itemSalesData}
              layout="vertical"
              margin={{ left: 8, right: 40 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatYen(v)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v, _name, entry) => [
                  `${formatYen(Number(v))}（${(entry.payload as (typeof itemSalesData)[number]).冊数}冊）`,
                  "売上高",
                ]}
              />
              <Bar dataKey="売上高" fill={C.rose} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 時間別頒布冊数 */}
      {timeData.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold">時間別頒布冊数（30分刻み）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-muted)"
              />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, name) => [
                  `${Number(v)}冊`,
                  name === "__total__"
                    ? "合計"
                    : itemName(String(name)),
                ]}
              />
              <Line
                type="monotone"
                dataKey="__total__"
                name="__total__"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
              />
              {timeItemIds.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={id}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center gap-1 text-sm">
              <div className="border-muted-foreground h-0.5 w-4 border-t-2 border-dashed" />
              合計
            </div>
            {timeItemIds.map((id, i) => (
              <div key={id} className="flex items-center gap-1 text-sm">
                <div
                  className="h-0.5 w-4"
                  style={{ background: LINE_COLORS[i % LINE_COLORS.length] }}
                />
                {itemName(id)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
