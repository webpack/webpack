import { log } from "./helper.js";

log(await import("./callTextApi.js"));

fetch(API("./trackUser.js", "analytics/track")).catch(() => {});

export {};

document.addEventListener("load", () => {
	if (__webpack_layer__ === "modern") {
		navigator.serviceWorker.register(
			/* webpackEntryOptions: { filename: "client/sw.js" } */
			new URL("./sw.js", import.meta.url)
		);
	}
	if (__webpack_layer__ === "client") {
		navigator.serviceWorker.register(
			/* webpackEntryOptions: { filename: "client/modern-sw.js" } */
			new URL("./sw.js", import.meta.url)
		);
	}
});
