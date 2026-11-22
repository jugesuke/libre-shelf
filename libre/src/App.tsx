import { BrowserRouter, Route, Routes } from "react-router";
import LandingPage from "@libre/app/landing/landing";
import DataApp from "@libre/app/data/data";
import EventListPage from "@libre/app/event/event-list";
import EventResultPage from "@libre/app/event/event-result";
import EventApp from "@libre/pages/event/event-app";
import ItemsApp from "@libre/pages/items/items";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/items" element={<ItemsApp />} />
        <Route path="/data" element={<DataApp />} />
        <Route path="/event" element={<EventListPage />} />
        <Route path="/event/session" element={<EventApp />} />
        <Route path="/event/session/*" element={<EventApp />} />
        <Route path="/event/result/:id" element={<EventResultPage />} />
        <Route path="/*" element={<EventListPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
