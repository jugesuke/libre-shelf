import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ToastProvider } from "@shelf/ui/components/toast";
import { setupBarcodeDetector } from "@libre/common/barcode/prepare-barcode-detector";
import { RepositoriesProvider } from "@libre/data/repositories-context";
import { createLocalRepositories } from "@libre/data/local/local-repositories";
import { fetchIsdnResult } from "@libre/data/local/fetch-isdn";
import { AppShellProvider } from "@libre/app/app-shell";
import { libreAppShell } from "@libre/app/libre-app-shell";
import { TextsProvider } from "@libre/app/texts";
import { libreAppTexts } from "@libre/app/libre-app-texts";
import { EventAdapterProvider } from "@libre/pages/event/event-adapter";
import { libreEventAdapter } from "@libre/app/event/libre-event-adapter";

setupBarcodeDetector();

const repositories = createLocalRepositories({ storage: localStorage, fetchIsdn: fetchIsdnResult });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RepositoriesProvider value={repositories}>
      <AppShellProvider value={libreAppShell}>
        <TextsProvider value={libreAppTexts}>
          <EventAdapterProvider value={libreEventAdapter}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </EventAdapterProvider>
        </TextsProvider>
      </AppShellProvider>
    </RepositoriesProvider>
  </StrictMode>,
);
