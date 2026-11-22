import { useRef, useState } from "react";
import { downloadJson } from "@libre/common/download";
import { buildExport, importItems, loadItems } from "@libre/data/local/item-store";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { useToast } from "@shelf/ui/components/toast";
import { importItemsFailureMessage, importItemsSuccessMessage } from "./items-messages";

/**
 * 商品一覧の上の、商品の「書き出す」と「読み込む」。右寄せのボタンだけの行で、
 * 2 行のアラートが入る高さを、失敗がないときも取っておく。失敗は「書き出す」の左に出す
 */
export function ItemsToolbar({ disabled, onChanged }: { disabled: boolean; onChanged: () => void }) {
  const [failure, setFailure] = useState<string>();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setFailure(undefined);
    const loaded = loadItems(localStorage);
    if (!loaded.ok) return;
    const { fileName, content } = buildExport(loaded.items, new Date());
    downloadJson(fileName, content);
  };

  const handleImportFile = async (file: File) => {
    setFailure(undefined);
    const result = importItems(localStorage, await file.text());
    if (!result.ok) {
      setFailure(importItemsFailureMessage(result.reason));
      return;
    }
    showToast(importItemsSuccessMessage(result.count));
    onChanged();
  };

  return (
    <div className="flex min-h-14 items-center justify-end gap-3">
      {failure && (
        <Alert variant="destructive" className="flex-1">
          {failure}
        </Alert>
      )}
      <Button onClick={handleExport} disabled={disabled}>
        書き出す
      </Button>
      <Button onClick={() => fileInputRef.current?.click()} disabled={disabled}>
        読み込む
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
    </div>
  );
}
