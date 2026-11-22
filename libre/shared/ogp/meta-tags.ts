import type { HtmlTagDescriptor } from "vite";

const DESCRIPTION =
  "頒布しながら、会計のたびに記録が残ります。帰ってから、売れ方やお釣りの足り方を振り返れます。";

const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({
  tag: "meta",
  attrs,
  injectTo: "head",
});

/**
 * SITE_URL を検査し、末尾の / をすべて除いて返す。
 * @throws http: でも https: でもない URL、またはクエリかフラグメントを含むとき
 */
const normalizeSiteUrl = (siteUrl: string): string => {
  if (!URL.canParse(siteUrl)) {
    throw new Error(`SITE_URL が URL ではありません: ${siteUrl}`);
  }
  const url = new URL(siteUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `SITE_URL は http: か https: の URL にしてください: ${siteUrl}`,
    );
  }
  if (/[?#]/.test(siteUrl)) {
    throw new Error(
      `SITE_URL にクエリかフラグメントを含めないでください: ${siteUrl}`,
    );
  }
  return siteUrl.replace(/\/+$/, "");
};

/**
 * SITE_URL からOGPの meta タグの一覧を作る。
 * @param siteUrl 公開先の URL。前後の空白は除く。空なら、og:url と og:image を置かない
 * @returns index.html の head に差し込む meta タグ
 * @throws SITE_URL が http: または https: の URL でないとき
 */
export const buildOgpMetaTags = (
  siteUrl: string | undefined,
): HtmlTagDescriptor[] => {
  const trimmed = siteUrl?.trim() ?? "";
  const common = [
    meta({ name: "description", content: DESCRIPTION }),
    meta({ property: "og:type", content: "website" }),
    meta({ property: "og:title", content: "Libre Shelf" }),
    meta({ property: "og:description", content: DESCRIPTION }),
    meta({ name: "twitter:card", content: "summary_large_image" }),
  ];
  if (trimmed === "") {
    return common;
  }

  const root = normalizeSiteUrl(trimmed);
  return [
    ...common,
    meta({ property: "og:url", content: `${root}/` }),
    meta({ property: "og:image", content: `${root}/ogp.png` }),
  ];
};
