import type { Item } from "@libre-shared/entity/items/item";
import { useId, useRef, useState } from "react";
import { CameraButton } from "@libre/common/barcode/camera-modal";
import { Button } from "@shelf/ui/components/button";
import { Input } from "@shelf/ui/components/input";
import { SegmentedControl } from "@shelf/ui/components/segmented-control";
import { Select } from "@shelf/ui/components/select";

type InputMode = "text" | "select";

type Props = {
  items: Item[];
  onSelect: (item: Item) => void;
  /** すでに選択済みのIDをプルダウンから除外する */
  excludeIds?: Set<string>;
  /** 欄の `id`。`Field` の `controlId` と同じ値にして、項目名を欄につなぐ */
  id?: string;
  /** カメラのモーダルを上端に揃える（即売会の画面で使う） */
  alignCameraTop?: boolean;
};

/**
 * 商品を「バーコード/直接入力」または「一覧から選択」で選ぶ共通コンポーネント。
 * 選択が確定すると onSelect(item) を呼ぶ。
 */
export function ItemInput({
  items,
  onSelect,
  excludeIds,
  id,
  alignCameraTop = false,
}: Props) {
  const [mode, setMode] = useState<InputMode>("text");
  const [textValue, setTextValue] = useState("");
  const [textError, setTextError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const availableItems = excludeIds
    ? items.filter((i) => !excludeIds.has(i.item_id))
    : items;

  const switchMode = (next: InputMode) => {
    setMode(next);
    setTextValue("");
    setTextError(null);
  };

  const confirmText = (value: string) => {
    const id = value.trim();
    if (!id) return;
    const item = items.find((i) => i.item_id === id);
    if (!item) {
      setTextValue("");
      setTextError("この商品は登録されていません。");
      inputRef.current?.focus();
      return;
    }
    if (excludeIds?.has(item.item_id)) {
      setTextValue("");
      setTextError("すでに追加されています。");
      inputRef.current?.focus();
      return;
    }
    setTextValue("");
    setTextError(null);
    onSelect(item);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.key !== "Enter") return;
    confirmText(textValue);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const item = items.find((i) => i.item_id === id);
    if (!item) return;
    onSelect(item);
    // 選択後はリセット（次の追加のため）
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        options={[
          { value: "text", label: "バーコード / 直接入力" },
          { value: "select", label: "一覧から選択" },
        ]}
        value={mode}
        onChange={switchMode}
        className="self-start"
      />

      {mode === "text" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              id={id}
              type="text"
              value={textValue}
              onChange={(e) => {
                setTextValue(e.target.value);
                setTextError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="バーコードをスキャン、または商品IDを入力"
              aria-invalid={textError ? true : undefined}
              aria-describedby={textError ? errorId : undefined}
              className="min-w-0 flex-1"
            />
            <Button onClick={() => confirmText(textValue)}>追加</Button>
            <CameraButton
              alignTop={alignCameraTop}
              onRead={(itemId) => {
                setTextValue(itemId);
                confirmText(itemId);
              }}
            />
          </div>
          {textError && (
            <p
              id={errorId}
              className="text-destructive-muted-foreground text-xs"
            >
              {textError}
            </p>
          )}
        </div>
      ) : (
        <Select id={id} onChange={handleSelectChange} defaultValue="">
          <option value="" disabled>
            商品を選択してください
          </option>
          {availableItems.map((item) => (
            <option key={item.item_id} value={item.item_id}>
              {item.product_name}（{item.publisher_name}）
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
