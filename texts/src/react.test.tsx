import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createTexts } from "./react.tsx";
import { choose, text, value } from "./text.ts";

type Schema = {
  list: { title: {}; failed: { status: number } };
  other: { title: {} };
};
const { defineTexts, TextsProvider, useTexts } = createTexts<Schema>();

const dictionary = defineTexts({
  list: {
    title: text`一覧`,
    failed: choose("status", {
      404: text`なし`,
      default: text`失敗（HTTP ${value("status")}）`,
    }),
  },
  other: { title: text`別の画面` },
});

const List = ({ status }: { status: number }) => {
  const t = useTexts("list");
  return (
    <p>
      {t("title")}/{t("failed", { status })}
    </p>
  );
};

describe("useTexts", () => {
  it("Provider の辞書から、画面の文言を値つきで取り出す", () => {
    const html = renderToStaticMarkup(
      <TextsProvider value={dictionary}>
        <List status={500} />
      </TextsProvider>,
    );
    expect(html).toBe("<p>一覧/失敗（HTTP 500）</p>");
  });

  it("辞書を差し替えると別の文言を返す", () => {
    const other = defineTexts({
      list: { title: text`LIST`, failed: text`NG ${value("status")}` },
      other: { title: text`x` },
    });
    const html = renderToStaticMarkup(
      <TextsProvider value={other}>
        <List status={1} />
      </TextsProvider>,
    );
    expect(html).toBe("<p>LIST/NG 1</p>");
  });

  it("Provider の外では例外を投げる", () => {
    expect(() => renderToStaticMarkup(<List status={1} />)).toThrow("TextsProvider");
  });
});
