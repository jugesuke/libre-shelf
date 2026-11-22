import type { Item } from "@libre-shared/entity/items/item";
import { CameraButton } from "@libre/common/barcode/camera-modal";
import { Button } from "@shelf/ui/components/button";
import { Field } from "@shelf/ui/components/field";
import { FloatingAlert } from "@shelf/ui/components/floating-alert";
import { Input } from "@shelf/ui/components/input";
import { useRepositories } from "@libre/data/repositories-context";
import { useCallback, useRef, useState, type MouseEventHandler } from "react";
import { ISDN_LENGTH } from "./constants";
import { isdnFailureMessage, validateIsdnInput } from "./isdn-registration";

interface AddByISDNProps {
  /** 商品を足せたあとに呼ぶ。足した商品を渡す */
  onSubmit: (item: Item) => void | Promise<void>;
  /** 「追加」のボタンの種類。主要な操作が別にあるダイアログでは secondary にする */
  addButtonVariant?: "primary" | "secondary";
  /** ISDN を持たない商品を登録する欄を開く操作の名前。「ISDN の情報が足りません」の文言に入る */
  manualEntryLabel?: string;
}

const normalizeDigits = (value: string): string => {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
};

const validateIsdn = (value: string): boolean => {
  return /^\d+$/.test(value);
};

export function AddByISDN({
  onSubmit,
  addButtonVariant = "primary",
  manualEntryLabel = "新規商品を追加",
}: AddByISDNProps) {
  const repos = useRepositories();
  const [isdn, setIsdn] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<string>();
  const isSendingRef = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submitIsdn = useCallback(
    async (isdnValue: string) => {
      if (isSendingRef.current) return;

      isSendingRef.current = true;
      setIsLoading(true);
      setFailure(undefined);

      try {
        const res = await repos.items.addByIsdn(isdnValue.trim());

        if (!res.ok) {
          console.error("Failed to add item by ISDN:", res.status, res.detail);
          setFailure(isdnFailureMessage(res.status, manualEntryLabel));
          return;
        }

        setIsdn("");
        await onSubmit(res.value);
      } catch (error) {
        console.error("Failed to add item by ISDN:", error);
        setFailure(isdnFailureMessage("offline", manualEntryLabel));
      } finally {
        setIsLoading(false);
        isSendingRef.current = false;
      }
    },
    [onSubmit, manualEntryLabel],
  );

  const handleIsdnChange = (value: string) => {
    if (isSendingRef.current) return;

    const normalized = normalizeDigits(value);
    setIsdn(normalized);
    setFailure(undefined);

    if (normalized.length === ISDN_LENGTH && validateIsdn(normalized)) {
      setTimeout(() => submitIsdn(normalized), 0);
    }
  };

  const submitIsdnHandler = async () => {
    if (isSendingRef.current) return;

    const trimmedIsdn = isdn.trim();

    const invalid = validateIsdnInput(trimmedIsdn);
    if (invalid !== undefined) {
      setFailure(invalid);
      return;
    }

    await submitIsdn(trimmedIsdn);
  };

  const handleSubmitClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    submitIsdnHandler();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitIsdnHandler();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitIsdnHandler();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div ref={rowRef} className="flex items-end gap-3">
      <div className="flex-1">
        <Field label="ISDN">
          <Input
            value={isdn}
            onChange={(e) => handleIsdnChange(e.target.value)}
            placeholder="ISDNコードを入力"
            onKeyDown={handleKeyDown}
          />
        </Field>
      </div>
      <Button
        ref={buttonRef}
        variant={addButtonVariant}
        onClick={handleSubmitClick}
        loading={isLoading}
      >
        追加
      </Button>
      <CameraButton onRead={handleIsdnChange} />
      </div>
      <FloatingAlert
        anchor={rowRef}
        target={buttonRef}
        message={failure ?? ""}
        open={failure !== undefined}
        onClose={() => setFailure(undefined)}
      />
    </form>
  );
}
