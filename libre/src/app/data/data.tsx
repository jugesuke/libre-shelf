import { buildBackup, importData } from "@libre/data/local/backup-store";
import { downloadJson } from "@libre/common/download";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { Alert } from "@shelf/ui/components/alert";
import { Button } from "@shelf/ui/components/button";
import { Card } from "@shelf/ui/components/card";
import { Page } from "@shelf/ui/components/page";
import { useToast } from "@shelf/ui/components/toast";
import { useRef, useState } from "react";
import { LibreFrame as Frame } from "../libre-frame";
import { EXPORT_FAILED, importMessage } from "./data-messages";

/** ボタンだけの行。2 行のアラートが入る高さを、失敗がないときも取っておく。 */
const ButtonRow = ({ error, children }: { error?: string; children: React.ReactNode }) => (
  <div className="flex min-h-14 items-center justify-end gap-3">
    {error && (
      <Alert variant="destructive" className="flex-1">
        {error}
      </Alert>
    )}
    {children}
  </div>
);

function DataApp() {
  const [exportError, setExportError] = useState<string>();
  const [importError, setImportError] = useState<string>();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    setExportError(undefined);
    const result = buildBackup(localStorage, new Date());
    if (result.ok) downloadJson(result.fileName, result.content);
    else setExportError(EXPORT_FAILED);
  };

  const handleImportFile = async (file: File) => {
    setImportError(undefined);
    const result = importData(localStorage, await file.text(), formatSessionTime(new Date()));
    if (result.ok) showToast(importMessage(result));
    else setImportError(importMessage(result));
  };

  return (
    <Frame currentTab="data">
      <Page title="データの管理" width="narrow">
        <div className="flex flex-col gap-4">
          <Card title="まとめて書き出す">
            <p className="text-sm">
              商品と、即売会の記録をすべて、1つのファイルに保存します。端末を替えるときや、データが消えたときに備えて取っておけます。
            </p>
            <ButtonRow error={exportError}>
              <Button onClick={handleExport}>すべて書き出す</Button>
            </ButtonRow>
          </Card>

          <Card title="読み込む">
            <p className="text-sm">
              「すべて書き出す」や「ファイルに書き出す」で保存したファイルを読み込みます。いまの端末にある記録は消えません。同じ商品は、ファイルの内容で上書きします。
            </p>
            <ButtonRow error={importError}>
              <Button onClick={() => fileInputRef.current?.click()}>読み込む</Button>
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
            </ButtonRow>
          </Card>
        </div>
      </Page>
    </Frame>
  );
}

export default DataApp;
