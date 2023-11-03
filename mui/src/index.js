import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import NotificationProvider from "./NotificationProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
);
