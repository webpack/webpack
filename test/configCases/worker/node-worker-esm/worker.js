import { parentPort } from "worker_threads";
import { getMessage } from "./chunk.js";

parentPort.on("message", (msg) => {
	// Worker with ESM import
	parentPort.postMessage(getMessage(msg));
});
