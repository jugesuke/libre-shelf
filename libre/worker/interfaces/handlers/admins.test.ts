import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "@libre-worker/interfaces/server";

describe("GET /status", () => {
  it("サーバが稼働中であれば200と { status: \"ok\" } を返す", async () => {
    const res = await app.request("/api/v1/status", undefined, env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
