import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./styles.css";

// One address for the app. Render's redirect rules match on path, not host, so a
// rule on the service would loop — both hostnames are the same service. Done here
// instead, before anything renders, and only when a canonical host is configured,
// so localhost and preview builds are untouched.
const canonicalHost = import.meta.env.VITE_CANONICAL_HOST;
if (canonicalHost && window.location.hostname !== canonicalHost) {
  const target = new URL(window.location.href);
  target.hostname = canonicalHost;
  target.protocol = "https:";
  target.port = "";
  window.location.replace(target.toString());
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
