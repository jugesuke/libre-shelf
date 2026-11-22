import { AppFrame as Frame } from "@libre/app/app-shell";
import {
  deleteEventSession,
  loadEventSession,
  saveEventSession,
} from "@libre/common/event-session/storage";
import { useOpeningFormStore } from "@libre/common/event-session/opening-form-store";
import { usePreparationFormStore } from "@libre/common/event-session/preparation-form-store";
import { useClosingFormStore } from "@libre/common/event-session/closing-form-store";
import { useDoneFormStore } from "@libre/common/event-session/done-form-store";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { EventSessionV20261121 } from "@libre-shared/entity/event/v2026-11-21/event-session";
import { useEventAdapter } from "./event-adapter";
import { PreparationPage } from "./preparation/preparation";
import { OpeningPage } from "./opening/opening";
import { RegisterPage } from "./register/register";
import { ClosingPage } from "./closing/closing";
import { DonePage } from "./done/done";

function EventApp() {
  const navigate = useNavigate();
  const { resetPreparationEventInput } = useEventAdapter();
  const [session, setSession] = useState<EventSessionV20261121 | null>(
    loadEventSession,
  );

  const handleSessionUpdate = (updated: EventSessionV20261121) => {
    saveEventSession(updated);
    setSession(updated);
  };

  const handleDiscard = () => {
    deleteEventSession();
    useOpeningFormStore.getState().reset();
    usePreparationFormStore.getState().reset();
    resetPreparationEventInput();
    useClosingFormStore.getState().reset();
    useDoneFormStore.getState().reset();
    navigate("/event");
  };

  const renderContent = () => {
    if (!session || session.settled || session.phase === "preparation") {
      return (
        <PreparationPage
          session={session}
          onSessionUpdate={handleSessionUpdate}
          onDiscard={handleDiscard}
        />
      );
    }
    if (session.phase === "opening") {
      return (
        <OpeningPage
          session={session}
          onSessionUpdate={handleSessionUpdate}
          onDiscard={handleDiscard}
        />
      );
    }
    if (session.phase === "register") {
      return (
        <RegisterPage
          session={session}
          onSessionUpdate={handleSessionUpdate}
          onDiscard={handleDiscard}
          onProceedToClosing={() =>
            handleSessionUpdate({ ...session, phase: "closing" })
          }
        />
      );
    }
    if (session.phase === "closing") {
      return (
        <ClosingPage
          session={session}
          onSessionUpdate={handleSessionUpdate}
          onDiscard={handleDiscard}
          onBackToRegister={() =>
            handleSessionUpdate({ ...session, phase: "register" })
          }
        />
      );
    }
    if (session.phase === "done") {
      return (
        <DonePage
          session={session}
          onSessionUpdate={handleSessionUpdate}
          onDiscard={handleDiscard}
          onComplete={() => {
            useOpeningFormStore.getState().reset();
            usePreparationFormStore.getState().reset();
            resetPreparationEventInput();
            useClosingFormStore.getState().reset();
            useDoneFormStore.getState().reset();
            navigate("/event");
          }}
        />
      );
    }
    return (
      <div className="p-8 text-gray-500">
        このフェーズ（{session.phase}）は未実装です。
      </div>
    );
  };

  return <Frame currentTab="event">{renderContent()}</Frame>;
}

export default EventApp;
