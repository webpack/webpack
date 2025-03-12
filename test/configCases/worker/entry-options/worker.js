import { parentPort } from "worker_threads";

parentPort.on("message", async data => {
	const { upper } = await import("./module");
	parentPort.postMessage(`data: ${upper(data)}, thanks`);
});
