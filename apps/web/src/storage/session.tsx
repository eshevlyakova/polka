import { createContext, useContext } from "react";
import type { Account } from "../../../../shared/account";
import type { RemoteRepository } from "./remote";

export type StateSession = {
  mode: "account";
  user: Account;
  repository: RemoteRepository;
  logout: () => Promise<void>;
  reauthenticate: () => Promise<void>;
};
export const StateSessionContext = createContext<StateSession | null>(null);
export const useStateSession = () => useContext(StateSessionContext);
