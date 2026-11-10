import store from "./store";
import "./mod";

self.onmessage = async ({ data: msg }) => {
	try {
		if (msg === "next") await import.meta.webpackHot.check(true);
		self.postMessage(String(store.value));
	} catch (err) {
		self.postMessage(`error: ${err.stack}`);
	}
};
