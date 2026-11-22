import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIsdnItem, fetchIsdnResult } from "./fetch-isdn";

const ISDN = "2784702901978";
const valid = {
  item_id: ISDN,
  product_name: "本",
  publisher_name: "円",
  class: "オリジナル",
  type: "同人誌",
};

const respond = (body: unknown, status = 200) =>
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(body, { status })));

afterEach(() => vi.unstubAllGlobals());

describe("fetchIsdnItem", () => {
  it("Item の形の応答は商品として返す", async () => {
    respond(valid);
    expect(await fetchIsdnItem(ISDN)).toEqual(valid);
  });
  it("Item の形でない応答は失敗として null にする", async () => {
    respond({ ...valid, product_name: "" });
    expect(await fetchIsdnItem(ISDN)).toBeNull();
  });
  it("成功以外の応答は null にする", async () => {
    respond({ message: "x" }, 404);
    expect(await fetchIsdnItem(ISDN)).toBeNull();
  });
});

describe("fetchIsdnResult", () => {
  it("Item の形の応答は商品として返す", async () => {
    respond(valid);
    expect(await fetchIsdnResult(ISDN)).toEqual({ ok: true, item: valid });
  });
  it.each([
    [404, "not_found"],
    [502, "unavailable"],
    [400, "incomplete"],
    [422, "invalid_isdn"],
    [500, "other"],
    [503, "other"],
  ])("応答が %i のときは %s", async (status, reason) => {
    respond({ message: "x" }, status);
    expect(await fetchIsdnResult(ISDN)).toEqual({ ok: false, reason });
  });
  it("200 でも中身が Item の形でなければ incomplete", async () => {
    respond({ ...valid, product_name: "" });
    expect(await fetchIsdnResult(ISDN)).toEqual({ ok: false, reason: "incomplete" });
  });
  it("200 でも JSON として読めなければ incomplete", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchIsdnResult(ISDN)).toEqual({ ok: false, reason: "incomplete" });
  });
  it("応答が返らなければ offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchIsdnResult(ISDN)).toEqual({ ok: false, reason: "offline" });
  });
});
