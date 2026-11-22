import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "@libre-worker/interfaces/server";
import isdnXml from "@libre-worker/test/fixtures/isdn-2784702901978.xml?raw";

const ISDN = "2784702901978";

/** isdn.jp の応答を、URL ごとに返すようモックする */
function mockIsdnFetch(respond: (url: string) => Response | Promise<Response>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return respond(url.href);
  });
}

const get = (isdn: string) => app.request(`/api/v1/isdn/${isdn}`, { method: "GET" }, env);

describe("GET /isdn/{isdn}", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isdn.jp の情報を Item の形で返す", async () => {
    mockIsdnFetch((url) =>
      url === `https://isdn.jp/xml/${ISDN}`
        ? new Response(isdnXml, { status: 200 })
        : new Response("Not Found", { status: 404 }),
    );

    const res = await get(ISDN);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      item_id: ISDN,
      product_name: "みほん同人誌",
      publisher_name: "見本サークル",
      class: "オリジナル",
      type: "同人誌",
      genre_code: "106",
      price: 100,
      sample_image_url: "https://isdn.jp/images/thumbs/2784702901978.png",
    });
  });

  it("isdn.jp に登録がなければ 404 を返す", async () => {
    mockIsdnFetch(() => new Response("Not Found", { status: 404 }));
    expect((await get(ISDN)).status).toBe(404);
  });

  it("isdn.jp が 404 以外のエラーを返したら 502 を返す", async () => {
    mockIsdnFetch(() => new Response("error", { status: 500 }));
    expect((await get(ISDN)).status).toBe(502);
  });

  it("isdn.jp に接続できなければ 502 を返す", async () => {
    mockIsdnFetch(() => {
      throw new TypeError("network error");
    });
    expect((await get(ISDN)).status).toBe(502);
  });

  it("応答の形が違えば 400 を返す", async () => {
    mockIsdnFetch(() => new Response("<isdn></isdn>", { status: 200 }));
    expect((await get(ISDN)).status).toBe(400);
  });

  it("Item に使わない disp-isdn がなくても 200 を返す", async () => {
    const xml = isdnXml.replace(/<disp-isdn>.*<\/disp-isdn>\n/, "");
    mockIsdnFetch((url) =>
      url === `https://isdn.jp/xml/${ISDN}`
        ? new Response(xml, { status: 200 })
        : new Response("Not Found", { status: 404 }),
    );

    expect((await get(ISDN)).status).toBe(200);
  });

  it("sample-image-uri が URL の形でなければ、sample_image_url のない Item を返す", async () => {
    const xml = isdnXml.replace(
      "<sample-image-uri>https://isdn.jp/images/thumbs/2784702901978.png</sample-image-uri>",
      "<sample-image-uri>not a url</sample-image-uri>",
    );
    mockIsdnFetch((url) =>
      url === `https://isdn.jp/xml/${ISDN}`
        ? new Response(xml, { status: 200 })
        : new Response("Not Found", { status: 404 }),
    );

    const res = await get(ISDN);
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty("sample_image_url");
  });

  it("sample-image-uri が空なら、sample_image_url のない Item を返す", async () => {
    const xml = isdnXml.replace(
      "<sample-image-uri>https://isdn.jp/images/thumbs/2784702901978.png</sample-image-uri>",
      "<sample-image-uri></sample-image-uri>",
    );
    mockIsdnFetch((url) =>
      url === `https://isdn.jp/xml/${ISDN}`
        ? new Response(xml, { status: 200 })
        : new Response("Not Found", { status: 404 }),
    );

    const res = await get(ISDN);
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty("sample_image_url");
  });

  it.each(["product-name", "publisher-name", "class", "type"])(
    "必須の %s が空白だけなら 400 を返す",
    async (tag) => {
      const xml = isdnXml.replace(
        new RegExp(`<${tag}>.*</${tag}>`),
        `<${tag}>   </${tag}>`,
      );
      mockIsdnFetch((url) =>
        url === `https://isdn.jp/xml/${ISDN}`
          ? new Response(xml, { status: 200 })
          : new Response("Not Found", { status: 404 }),
      );

      expect((await get(ISDN)).status).toBe(400);
    },
  );

  it.each(["product-name", "publisher-name", "class", "type"])(
    "必須の %s がなければ 400 を返す",
    async (tag) => {
      const xml = isdnXml.replace(new RegExp(`<${tag}>.*</${tag}>\\n`), "");
      mockIsdnFetch((url) =>
        url === `https://isdn.jp/xml/${ISDN}`
          ? new Response(xml, { status: 200 })
          : new Response("Not Found", { status: 404 }),
      );

      expect((await get(ISDN)).status).toBe(400);
    },
  );
});
