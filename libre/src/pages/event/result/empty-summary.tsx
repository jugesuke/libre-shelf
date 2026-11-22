import { formatYen } from "@libre/common/format";

/** グラフの場所に文を書く。高さは、そこに出るグラフと同じだけ取る */
function EmptyChart({
  title,
  height,
  message,
}: {
  title: string;
  height: number;
  message: string;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div
        data-slot="empty-chart"
        className="bg-surface-muted text-muted-foreground flex items-center justify-center rounded-md px-4 text-center text-sm"
        style={{ height }}
      >
        {message}
      </div>
    </section>
  );
}

/**
 * 会計が 1 件もないときの集計。集計の形を残し、総売上を ¥0 にして、グラフの場所に文を出す。
 * 高さは、会計があるときの商品別売上（1 商品分）と時間別頒布冊数のグラフに合わせている。
 * finished は、終わった即売会の記録を見る画面（結果の画面）のとき true にする。
 * 開催中の集計画面では、これから会計を足せるので、どうすれば出るかを書く。
 */
export function EmptyEventSummary({ finished }: { finished: boolean }) {
  const message = finished
    ? "会計記録がありませんでした。"
    : "まだ会計記録がありません。レジで会計すると表示されます。";
  return (
    <div data-slot="empty-summary" className="space-y-6">
      <div className="text-center">
        <div className="text-muted-foreground text-sm">総売上</div>
        <div className="text-4xl font-bold">{formatYen(0)}</div>
      </div>
      <EmptyChart title="商品別売上" height={76} message={message} />
      <EmptyChart
        title="時間別頒布冊数（30分刻み）"
        height={200}
        message={message}
      />
    </div>
  );
}
