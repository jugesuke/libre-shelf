/**
 * `HTTPS_PROXY` があるとき、Playwright のブラウザに渡すプロキシの設定を返す。ないときは undefined。
 *
 * フォントを Google Fonts から読み込むので、プロキシを通す環境（Claude Code のサンドボックスなど）では、
 * ブラウザもプロキシを通さないとフォントが読み込まれず、代わりのフォントで描かれる。
 * Chromium は URL の中の認証の情報を使わず 407 になるので、username と password を分けて渡す。
 */
export function proxyFromEnv() {
  const value = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  if (!value) return undefined;
  const url = new URL(value);
  return {
    server: `${url.protocol}//${url.host}`,
    username: decodeURIComponent(url.username) || undefined,
    password: decodeURIComponent(url.password) || undefined,
    // テストで開く手元のサーバーは、プロキシを通さない
    bypass: "localhost,127.0.0.1",
  };
}
