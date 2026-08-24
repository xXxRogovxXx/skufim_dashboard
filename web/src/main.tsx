import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, ThemeToggle } from "./theme/theme";
import "@fontsource-variable/inter";
import "./theme/glass.css";
import "./theme/neobrutalism.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemeToggle />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
