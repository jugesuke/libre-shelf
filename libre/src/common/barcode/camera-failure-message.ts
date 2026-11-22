/** カメラを使えない状況。 */
export type CameraFailure =
  /** `navigator.mediaDevices.getUserMedia` がない */
  | { kind: "unsupported" }
  /** `getUserMedia` などカメラの起動で例外が出た */
  | { kind: "start"; error: unknown }
  /** カメラは起動したが、読み取りを始められない */
  | { kind: "scan" };

/** 状況に対応する、モーダルに表示する 1 文を返す。 */
export function cameraFailureMessage(failure: CameraFailure): string {
  switch (failure.kind) {
    case "unsupported":
      return "このブラウザではカメラを使えません";
    case "scan":
      return "バーコードを読み取れません";
    case "start": {
      const name =
        failure.error instanceof DOMException ? failure.error.name : "";
      if (name === "NotAllowedError") return "カメラの使用が許可されていません";
      if (name === "NotFoundError") return "カメラが見つかりません";
      return "カメラを起動できませんでした";
    }
  }
}
