import { formatDate } from "@libre/common/format";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { loadHistory } from "@libre/data/local/history-storage";
import { loadEventSession } from "@libre/common/event-session/storage";
import { LibreFrame as Frame } from "../libre-frame";
import { Button } from "@shelf/ui/components/button";
import { Page } from "@shelf/ui/components/page";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@shelf/ui/components/table";

function EventListPage() {
  const navigate = useNavigate();

  const existing = useMemo(() => loadEventSession(), []);
  const hasActiveSession = existing !== null && !existing.settled;
  // 履歴の値が読めないときは、履歴が 0 件のものとして表示する
  const sessions = useMemo(() => {
    const loaded = loadHistory(localStorage);
    return loaded.ok ? loaded.records : [];
  }, []);

  // 進行中セッションがあれば /event/session にリダイレクト
  useEffect(() => {
    if (hasActiveSession) navigate("/event/session", { replace: true });
  }, [hasActiveSession, navigate]);

  return (
    <Frame currentTab="event">
      <Page
        title="即売会"
        width="wide"
        actions={
          <Button variant="primary" onClick={() => navigate("/event/session")}>
            新しい店を開始する
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>即売会</TableHead>
                <TableHead>開催日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableEmpty colSpan={2}>
                  過去のイベント記録がありません。イベント終了の画面で「履歴に保存」を押すと、ここに表示されます。
                </TableEmpty>
              ) : (
                sessions.map((s) => (
                  <TableRow
                    key={s.id}
                    interactive
                    tabIndex={0}
                    onClick={() => navigate(`/event/result/${s.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/event/result/${s.id}`);
                    }}
                  >
                    <TableCell className="font-bold">
                      {s.session.eventName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.session.eventDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Page>
    </Frame>
  );
}

export default EventListPage;
