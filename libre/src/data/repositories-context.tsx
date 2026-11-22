import { createContext, useContext } from "react";
import type { EventSessionRepository, Repositories } from "./repositories";

const RepositoriesContext = createContext<Repositories | null>(null);

/** 画面とロジックに、アプリが選んだリポジトリを渡す */
export const RepositoriesProvider = RepositoriesContext.Provider;

/** `RepositoriesProvider` で渡したリポジトリを返す。渡されていなければ例外を投げる */
export const useRepositories = (): Repositories => {
  const repos = useContext(RepositoriesContext);
  if (!repos) throw new Error("RepositoriesProvider の中で使ってください");
  return repos;
};

/** 終わった即売会のセッションのリポジトリを返す。共通の一覧と結果画面が使う。渡されていなければ例外を投げる */
export const useEventSessionRepository = (): EventSessionRepository => {
  const { eventSessions } = useRepositories();
  if (!eventSessions) throw new Error("このアプリは eventSessions を渡していません");
  return eventSessions;
};
