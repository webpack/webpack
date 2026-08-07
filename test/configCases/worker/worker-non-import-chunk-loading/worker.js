import { parentPort } from "worker_threads";

parentPort.on("message", async () => {
	const m = await import("./lazy");
	parentPort.postMessage(m.value);
});
