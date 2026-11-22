import { describe, expect, it } from "vitest";
import { buildOgpMetaTags } from "./meta-tags";

const DESCRIPTION =
  "頒布しながら、会計のたびに記録が残ります。帰ってから、売れ方やお釣りの足り方を振り返れます。";

const baseTags = [
  {
    tag: "meta",
    attrs: { name: "description", content: DESCRIPTION },
    injectTo: "head",
  },
  {
    tag: "meta",
    attrs: { property: "og:type", content: "website" },
    injectTo: "head",
  },
  {
    tag: "meta",
    attrs: { property: "og:title", content: "Libre Shelf" },
    injectTo: "head",
  },
  {
    tag: "meta",
    attrs: { property: "og:description", content: DESCRIPTION },
    injectTo: "head",
  },
  {
    tag: "meta",
    attrs: { name: "twitter:card", content: "summary_large_image" },
    injectTo: "head",
  },
];

const urlTags = (url: string, imageUrl: string) => [
  {
    tag: "meta",
    attrs: { property: "og:url", content: url },
    injectTo: "head",
  },
  {
    tag: "meta",
    attrs: { property: "og:image", content: imageUrl },
    injectTo: "head",
  },
];

describe("buildOgpMetaTags", () => {
  it("SITE_URL が undefined のとき、og:url と og:image を置かない", () => {
    expect(buildOgpMetaTags(undefined)).toEqual(baseTags);
  });

  it("SITE_URL が空文字のとき、渡さなかったものとして扱う", () => {
    expect(buildOgpMetaTags("")).toEqual(baseTags);
  });

  it("SITE_URL から og:url と og:image を絶対 URL で作る", () => {
    expect(buildOgpMetaTags("https://libre-shelf.example.com")).toEqual([
      ...baseTags,
      ...urlTags(
        "https://libre-shelf.example.com/",
        "https://libre-shelf.example.com/ogp.png",
      ),
    ]);
  });

  it("SITE_URL の末尾の / があってもなくても同じ結果になる", () => {
    expect(buildOgpMetaTags("https://libre-shelf.example.com/")).toEqual(
      buildOgpMetaTags("https://libre-shelf.example.com"),
    );
  });

  it("SITE_URL の末尾の / が複数あっても、すべて除く", () => {
    expect(buildOgpMetaTags("https://libre-shelf.example.com//")).toEqual(
      buildOgpMetaTags("https://libre-shelf.example.com"),
    );
  });

  it("SITE_URL にパスがあるとき、そのパスの下に og:image を作る", () => {
    expect(buildOgpMetaTags("https://example.com/libre")).toEqual([
      ...baseTags,
      ...urlTags(
        "https://example.com/libre/",
        "https://example.com/libre/ogp.png",
      ),
    ]);
  });

  it("SITE_URL の前後の空白は除いて扱う", () => {
    expect(buildOgpMetaTags("  https://libre-shelf.example.com/ ")).toEqual(
      buildOgpMetaTags("https://libre-shelf.example.com"),
    );
  });

  it("空白だけの SITE_URL は、渡さなかったものとして扱う", () => {
    expect(buildOgpMetaTags("   ")).toEqual(baseTags);
  });

  it("http: の URL は受け付ける", () => {
    expect(buildOgpMetaTags("http://localhost:8080")).toEqual([
      ...baseTags,
      ...urlTags("http://localhost:8080/", "http://localhost:8080/ogp.png"),
    ]);
  });

  it("http: と https: 以外の URL のとき Error を投げる", () => {
    expect(() => buildOgpMetaTags("ftp://example.com")).toThrow(Error);
  });

  it("クエリかフラグメントを含む SITE_URL のとき Error を投げる", () => {
    expect(() => buildOgpMetaTags("https://example.com/?x=1")).toThrow(Error);
    expect(() => buildOgpMetaTags("https://example.com/#top")).toThrow(Error);
    expect(() => buildOgpMetaTags("https://example.com/?")).toThrow(Error);
  });

  it("URL として読めない文字列のとき Error を投げる", () => {
    expect(() => buildOgpMetaTags("libre-shelf.example.com")).toThrow(Error);
  });
});

describe("buildOgpMetaTags の戻り値", () => {
  it("meta タグは head に差し込む", () => {
    for (const tag of buildOgpMetaTags("https://example.com")) {
      expect(tag.tag).toBe("meta");
      expect(tag.injectTo).toBe("head");
    }
  });
});
