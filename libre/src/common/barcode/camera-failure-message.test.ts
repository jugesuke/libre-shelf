import { describe, expect, it } from "vitest";
import { cameraFailureMessage } from "./camera-failure-message";

describe("cameraFailureMessage", () => {
  it("getUserMedia を持たないとき", () => {
    expect(cameraFailureMessage({ kind: "unsupported" })).toBe(
      "このブラウザではカメラを使えません",
    );
  });

  it("NotAllowedError のとき", () => {
    const error = new DOMException("denied", "NotAllowedError");
    expect(cameraFailureMessage({ kind: "start", error })).toBe(
      "カメラの使用が許可されていません",
    );
  });

  it("NotFoundError のとき", () => {
    const error = new DOMException("none", "NotFoundError");
    expect(cameraFailureMessage({ kind: "start", error })).toBe(
      "カメラが見つかりません",
    );
  });

  it("それ以外の起動の失敗", () => {
    const error = new DOMException("busy", "NotReadableError");
    expect(cameraFailureMessage({ kind: "start", error })).toBe(
      "カメラを起動できませんでした",
    );
    expect(cameraFailureMessage({ kind: "start", error: "x" })).toBe(
      "カメラを起動できませんでした",
    );
  });

  it("カメラは起動したが読み取りを始められないとき", () => {
    expect(cameraFailureMessage({ kind: "scan" })).toBe(
      "バーコードを読み取れません",
    );
  });
});
