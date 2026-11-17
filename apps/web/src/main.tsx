import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./styles/surfaces.css";
import "./styles/receipt.css";
import "./styles/composition.css";
import "./styles/cooking.css";
import "./styles/library.css";
import { initializeTelegram } from "./telegram";
import { AccountGate } from "./components/AccountGate";
import "./styles/account.css";
initializeTelegram();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccountGate>
      <App />
    </AccountGate>
  </React.StrictMode>,
);
