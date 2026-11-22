import { Fragment, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { NAV_PAGES } from "../nav-sections";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Card } from "@shelf/ui/components/card";
import { Page } from "@shelf/ui/components/page";

const FEATURES = [
  {
    title: "頒布しながら記録",
    description:
      "会計するだけで、時刻、冊数、知り合いかどうか、受け取ったお札や硬貨の枚数が記録されます。来場者の数も、ボタンひとつで記録できます。",
  },
  {
    title: "売れ方を振り返る",
    description: "30分ごとの頒布冊数や、知り合いとそれ以外の内訳を見られます。",
  },
  {
    title: "お釣りを振り返る",
    description: "お札や硬貨ごとに、両替をせずに済むには最初に何枚用意しておけばよかったかが分かります。次の釣り銭の用意に使えます。",
  },
  {
    title: "委託元への連絡",
    description:
      "委託元ごとに、売れた冊数と売上、返す冊数をまとめた文をコピーできます。そのまま委託元への連絡に使えます。",
  },
] as const;

/** 説明の `**` で囲んだ言葉は太字にする */
const STEPS = [
  {
    title: "1. 商品を登録する",
    description:
      "頒布する本やグッズを登録しておきます。**ISDNを入れると**、isdn.jpに登録された情報から、**書名やサークル名を読み込めます**。",
  },
  {
    title: "2. 前日",
    description: "持っていく本と値段（**おしながき**）、持ち込む冊数を登録しておきます。",
  },
  {
    title: "3. 会場で",
    description:
      "**バーコードを読むだけで会計**できて、お釣りも計算します。**スマートフォンやタブレットのカメラでも読めます**。来場者の数やレジ金の出し入れも、ボタンひとつで記録できます。",
  },
  {
    title: "4. 撤収の前に",
    description: "残った本とレジのお金を数えて、**記録と合っているかを確かめます**。",
  },
  {
    title: "5. 帰ってから",
    description:
      "数え間違いを直して記録を保存します。**売上の集計や委託元への連絡**、お釣りが足りたかも、あとから見返せます。",
  },
] as const;

const themeOf = (key: "event" | "items") => NAV_PAGES.find((p) => p.key === key)!.theme;

/** ボタンを包む要素に置いて、中のボタンのプライマリカラーを画面の色にする */
const themeStyle = (key: "event" | "items"): CSSProperties => {
  const theme = themeOf(key);
  return {
    "--primary": theme.primary,
    "--primary-foreground": theme.primaryForeground,
    "--ring": theme.ring,
  } as CSSProperties;
};

/**
 * `**` で囲んだ言葉を `<strong>` にして返す。`**` は表示しない。
 * 偶数番目が通常の文、奇数番目が太字になる。
 */
function renderEmphasis(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** 即売会と商品管理への始めるボタン。それぞれの画面の色にする */
function StartButtons() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-3">
      <span style={themeStyle("event")}>
        <Button variant="primary" onClick={() => navigate("/event")}>
          即売会を始める
        </Button>
      </span>
      <span style={themeStyle("items")}>
        <Button variant="primary" onClick={() => navigate("/items")}>
          商品を登録する
        </Button>
      </span>
    </div>
  );
}

/**
 * アプリを紹介するランディングページ。`Frame` の外枠（メニュー）は使わず、
 * 上端のバーだけ `Frame` と同じ見た目で置く。
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-14 items-center bg-(--gray-900) px-3 text-white">
        <img src="/icon.svg" alt="" className="h-9 w-9" />
        <span className="ml-2 text-lg font-bold">Libre Shelf</span>
      </div>
      <main>
        <Page width="narrow" title="同人誌即売会のためのレジ" actions={<StartButtons />}>
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              頒布しながら、会計のたびに記録が残ります。帰ってから、売れ方やお釣りの足り方を振り返れます。
            </p>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">頒布しながら記録して、あとで振り返る</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {FEATURES.map(({ title, description }) => (
                  <div key={title} className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold">{title}</h3>
                    <p className="text-sm">{description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">使い方の流れ</h2>
              <div className="flex flex-col gap-4">
                {STEPS.map(({ title, description }) => (
                  <Card key={title} title={title}>
                    <p className="text-sm">{renderEmphasis(description)}</p>
                  </Card>
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">データの置き場所</h2>
              <p className="text-sm">
                アカウントは要りません。記録は、いま使っているこの端末の中に残ります。どこにも送らないので、会場で電波が届かなくても使えます。インターネットを使うのは、ISDNから商品を登録するときだけです。
              </p>
              <Alert variant="warning">
                ブラウザのサイトのデータを消すと、記録も消えます。残したい記録は「ファイルに書き出す」で保存しておいてください。
              </Alert>
            </section>
            <section className="flex flex-col gap-3">
              <p className="text-sm">さっそく使ってみましょう。</p>
              <StartButtons />
            </section>
          </div>
        </Page>
      </main>
    </div>
  );
}
