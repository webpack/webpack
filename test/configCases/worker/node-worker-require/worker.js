import { parentPort } from "worker_threads";

const { getMessage } = await import("./chunk.js");

parentPort.on("message", (msg) => {
	// Worker with ESM import
	parentPort.postMessage(getMessage(msg));
});
