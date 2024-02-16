import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import NotificationProvider from "./NotificationProvider";
import ShellProvider from "./ShellerProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <NotificationProvider>
    <ShellProvider>
      <App />
    </ShellProvider>
  </NotificationProvider>
);
