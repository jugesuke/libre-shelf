import { formatDate } from "@libre/common/format";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { buildSessionExport, removeRecord } from "@libre/data/local/history-storage";
import { formatSessionTime } from "@libre/common/event-session/session-time";
import { downloadJson } from "@libre/common/download";
import { LibreFrame as Frame } from "../libre-frame";
import { Alert } from "@shelf/ui/components/alert";
import { ConfirmDialog } from "@shelf/ui/components/confirm-dialog";
import { Button } from "@shelf/ui/components/button";
import { Page } from "@shelf/ui/components/page";
import { lookupResult } from "./result-lookup";
import EventResultV20261121 from "@libre/pages/event/result/v2026-11-21";

function EventResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const result = useMemo(() => lookupResult(localStorage, id ?? ""), [id]);
  const record = result.kind === "not_found" ? undefined : result.record;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const handleDelete = () => {
    if (!record) return;
    if (removeRecord(localStorage, record.id).ok) {
      navigate("/event");
      return;
    }
    setDeleteError(
      "記録を削除できませんでした。端末の空き容量を確認して、もう一度削除してください。",
    );
  };

  const handleExport = () => {
    if (!record) return;
    const { fileName, content } = buildSessionExport(record.session, formatSessionTime(new Date()));
    downloadJson(fileName, content);
  };

  return (
    <Frame currentTab="event">
      <Page
        title={record?.session.eventName ?? "イベント結果"}
        width="wide"
        actions={
          <div className="flex gap-3">
            <Button onClick={() => navigate("/event")}>一覧に戻る</Button>
            {record && <Button onClick={handleExport}>ファイルに書き出す</Button>}
            {record && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                削除
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {record && (
            <p className="text-muted-foreground text-sm">
              {formatDate(record.session.eventDate)}
            </p>
          )}

          {result.kind === "not_found" && (
            <Alert variant="warning">
              指定したイベントの記録が見つかりません。「一覧に戻る」から一覧に戻れます。
            </Alert>
          )}

          {result.kind === "unsupported" && (
            <Alert variant="warning">
              対応していないスキーマバージョンです。（{result.schemaVersion}）
            </Alert>
          )}

          {result.kind === "found" && (
            <EventResultV20261121 sessionJson={JSON.stringify(result.record.session)} />
          )}
        </div>
      </Page>
      {record && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteError(undefined);
          }}
          title="記録の削除"
          message="以下の記録を削除しますか？　この操作は元に戻せません。"
          target={[
            ["即売会", record.session.eventName],
            ["開催日", formatDate(record.session.eventDate)],
          ]}
          warning="この即売会の会計とレジ金の記録が、すべて失われます。残したいときは、先に「ファイルに書き出す」で保存してください。"
          requireTyping="削除"
          confirmLabel="削除"
          onConfirm={handleDelete}
          error={deleteError}
          onErrorClose={() => setDeleteError(undefined)}
        />
      )}
    </Frame>
  );
}

export default EventResultPage;
