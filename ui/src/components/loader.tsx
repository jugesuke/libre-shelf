import { LoaderCircle } from "lucide-react";

/** 回るローダー。スクリーンリーダーには「読み込み中」と伝える。色は呼び出し側の `color` を引き継ぐ。 */
function Loader() {
  return (
    <div role="status" className="flex justify-center">
      <LoaderCircle
        aria-label="読み込み中"
        strokeWidth={2.5}
        className="size-5 animate-spin"
      />
    </div>
  );
}

export { Loader };
