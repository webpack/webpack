import React, { lazy } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App.js";
import "./style.css";

if (import.meta.env.DEV) {
	console.log("client bundle, mode:", import.meta.env.MODE);
}

// The route is code-split, so its stylesheet would be discovered a round trip
// late; the one the server printed from the manifest is adopted, not fetched again.
const Page = lazy(() => import("./page.js"));

hydrateRoot(document.getElementById("root"), <App Page={Page} />);
