import Frame from "@shelf/ui/frame";
import type { ReactNode } from "react";
import { NAV_GROUPS, NAV_PAGES, type NavTabType } from "./nav-sections";

/** Libre Shelf のメニューと題名を渡した `Frame`。画面はこれで本文を包む */
export function LibreFrame(props: { currentTab: NavTabType; children: ReactNode }) {
  return (
    <Frame currentTab={props.currentTab} pages={NAV_PAGES} groups={NAV_GROUPS} title="Libre Shelf">
      {props.children}
    </Frame>
  );
}
