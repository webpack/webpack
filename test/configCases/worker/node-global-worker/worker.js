import { parentPort } from "worker_threads";

const { upper } = await import("./module.js");

parentPort.on("message", (data) => {
	parentPort.postMessage(`data: ${upper(data)}, thanks`);
});
