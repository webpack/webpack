import { parentPort } from "worker_threads";

parentPort.on("message", async data => {
	const { value } = await import("./worker-only.js");
	// referenced so `./shared` is reachable from the worker graph (not executed here)
	if (data === "never") await import("./shared.js");
	parentPort.postMessage(`worker:${value}`);
});
