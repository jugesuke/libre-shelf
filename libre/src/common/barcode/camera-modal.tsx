import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "@shelf/ui/components/button";
import { cn } from "@shelf/ui/lib/utils";
import { pickItemId } from "./pick-item-id";
import {
  cameraFailureMessage,
  type CameraFailure,
} from "./camera-failure-message";
import { getBarcodeDetector } from "./prepare-barcode-detector";

/** 読み取れたことを表示してから閉じるまでの時間（ミリ秒） */
const READ_NOTICE_MS = 700;
/** 読み取れたときの振動の長さ（ミリ秒） */
const VIBRATE_MS = 100;

type CameraModalProps = {
  onRead: (itemId: string) => void;
  onClose: () => void;
  alignTop: boolean;
};

/** カメラの映像からバーコードを読むモーダル。読んだら `onRead` を呼ぶ。 */
function CameraModal({ onRead, onClose, alignTop }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const titleId = useId();
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [read, setRead] = useState(false);
  // 親の再描画で effect が走り直してカメラが起動し直らないよう、最新の関数を ref で持つ
  const onReadRef = useRef(onRead);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onReadRef.current = onRead;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const stopRef: { stream: MediaStream | null } = { stream: null };
    const stopStream = () => stopRef.stream?.getTracks().forEach((t) => t.stop());
    // 映像を出さない失敗では、カメラも止める
    const failScan = () => {
      stopStream();
      setFailure({ kind: "scan" });
    };

    const run = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFailure({ kind: "unsupported" });
        return;
      }
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
        .catch((error: unknown) => {
          setFailure({ kind: "start", error });
          return null;
        });
      if (!stream) return;
      if (abort.signal.aborted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      stopRef.stream = stream;

      const video = videoRef.current;
      try {
        if (!video) throw new Error("video がない");
        const detector = new (getBarcodeDetector())({ formats: ["ean_13"] });
        video.srcObject = stream;
        await video.play();

        // 前のフレームの読み取りが終わるまで、次のフレームを読まない
        const scan = async () => {
          if (abort.signal.aborted) return;
          const itemId = pickItemId(await detector.detect(video), {
            width: video.videoWidth,
            height: video.videoHeight,
          });
          if (abort.signal.aborted) return;
          if (itemId !== null) {
            setRead(true);
            // navigator.vibrate を持たないブラウザ（iOS の Safari など）では振動しない
            navigator.vibrate?.(VIBRATE_MS);
            setTimeout(() => {
              if (!abort.signal.aborted) onReadRef.current(itemId);
            }, READ_NOTICE_MS);
            return;
          }
          requestAnimationFrame(() => void scanSafely());
        };
        const scanSafely = () =>
          scan().catch(() => {
            if (!abort.signal.aborted) failScan();
          });
        requestAnimationFrame(() => void scanSafely());
      } catch {
        failScan();
      }
    };
    void run();

    return () => {
      abort.abort();
      stopStream();
    };
  }, []);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex justify-center overflow-y-auto bg-overlay",
        alignTop ? "items-start py-4" : "items-center",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-md rounded-md bg-background p-6 text-foreground"
      >
        <h2 id={titleId} className="pr-10 text-lg font-bold">
          カメラでバーコードを読む
        </h2>
        <Button size="icon" aria-label="閉じる" onClick={onClose} className="absolute top-4 right-4">
          <X aria-hidden="true" />
        </Button>
        <div className="mt-4">
          {failure ? (
            <p role="alert" className="py-8 text-center text-foreground">
              {cameraFailureMessage(failure)}
            </p>
          ) : (
            <div
              data-testid="camera-frame"
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black"
            >
              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                data-testid="camera-line"
                className={clsx(
                  "absolute inset-x-0 top-1/2 -translate-y-1/2",
                  read
                    ? "border-t-4 border-solid border-t-[#03AF7A]"
                    : "border-t-2 border-dashed border-t-[#FF4B00]",
                )}
              />
              {read && (
                <p
                  role="status"
                  className="absolute bottom-1/2 left-1/2 mb-[2px] -translate-x-1/2 whitespace-nowrap rounded bg-[#03AF7A] px-2 py-0.5 text-sm font-bold text-[#111827]"
                >
                  <span aria-hidden="true">✓ </span>読み取りました
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CameraButtonProps = {
  /** 商品 ID を読んだときに呼ぶ */
  onRead: (itemId: string) => void;
  /** モーダルを上端に揃える（即売会の画面） */
  alignTop?: boolean;
  /** モーダルを閉じたあとに呼ぶ（読んだとき、閉じたときの両方） */
  onClosed?: () => void;
  className?: string;
};

/** 「カメラ」ボタン。押すとカメラでバーコードを読むモーダルを開く。 */
export function CameraButton({
  onRead,
  alignTop = false,
  onClosed,
  className,
}: CameraButtonProps) {
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    onClosed?.();
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn("shrink-0 whitespace-nowrap", className)}
      >
        カメラ
      </Button>
      {open && (
        <CameraModal
          alignTop={alignTop}
          onClose={close}
          onRead={(itemId) => {
            close();
            onRead(itemId);
          }}
        />
      )}
    </>
  );
}
