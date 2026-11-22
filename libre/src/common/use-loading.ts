import { useCallback, useState } from "react";

/**
 * 一覧の読み込みの状態を持つ。`track` で包んだ処理が終わるまでを読み込み中として数える。
 * `loading` は最初の読み込みが終わるまで真になり、「〜がありません」を出すのはそのあとにする。
 * `reloading` は最初の読み込みのあと、取り直している間だけ真になり、前の中身を出したまま薄くするのに使う。
 */
export function useLoading() {
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(0);

  const track = useCallback(async <T>(task: () => Promise<T>): Promise<T> => {
    setPending((n) => n + 1);
    try {
      return await task();
    } finally {
      setLoaded(true);
      setPending((n) => n - 1);
    }
  }, []);

  /** 別の一覧に切り替えたときなど、最初の読み込みからやり直す */
  const reset = useCallback(() => setLoaded(false), []);

  return { loading: !loaded, reloading: loaded && pending > 0, track, reset };
}
