import type { EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { resultProductName } from "@libre/common/event-session/menu-entry";
import { Dialog } from "@shelf/ui/components/dialog";
import { EventSummaryContent } from "@libre/pages/event/result/v2026-11-21/summary-content";

type Props = {
  session: EventSessionV20261121;
  onClose: () => void;
};

export function SummaryModal({ session, onClose }: Props) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="集計"
      size="md"
      initialFocus="title"
    >
      <EventSummaryContent
        session={session}
        itemName={(itemId) => resultProductName(session.menu, session.transactions, itemId)}
        finished={false}
      />
    </Dialog>
  );
}
