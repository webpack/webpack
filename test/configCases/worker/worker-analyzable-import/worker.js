import { parentPort } from "worker_threads";

parentPort.on("message", async () => {
	// The worker loads its own chunks through the same ESM loader as the main graph.
	const m = await import("./lazy");
	parentPort.postMessage(m.value);
});
