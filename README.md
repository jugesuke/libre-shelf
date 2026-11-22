# Libre Shelf

個人で同人誌を頒布するサークルが、同人誌即売会の会場で使うレジの Web アプリケーションです。前日の準備から、会場での販売、帰着後の振り返りまでを、1 台の端末で記録します。

データはすべて端末のブラウザ（localStorage）に置きます。サーバー（Cloudflare Workers）は状態を持たず、アプリのファイルを配ることと、ISDN の情報の取得を中継することだけをします。

## 構成

| ディレクトリ | 中身 |
|---|---|
| `libre/` | アプリ。仕様は `libre/docs/spec/`（入口は `index.md`） |
| `ui/` | UI の部品、デザインシステム、Storybook（`@shelf/ui`） |
| `texts/` | アプリごとに違う文言を組み立てる仕組み（`@shelf/texts`） |

## 動かす

Node.js 24.15.0 以上と pnpm が必要です。

```sh
pnpm install
cd libre
pnpm dev        # 開発サーバーを起動する
pnpm build      # ビルドする（型チェックも行う）
pnpm test       # 単体テストを実行する
pnpm test:e2e   # 画面をブラウザで開くテストを実行する（先に pnpm build を済ませる）
```

デザインシステムは、`ui/` で `pnpm storybook` を実行すると、Storybook で見られます。
