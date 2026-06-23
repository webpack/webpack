import { parentPort } from "worker_threads";

const ready = import("./module.js");

parentPort.on("message", async (data) => {
	const { upper } = await ready;
	parentPort.postMessage(`data: ${upper(data)}, thanks`);
});
