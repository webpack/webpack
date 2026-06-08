import { parentPort } from "worker_threads";

parentPort.on("message", async () => {
	const { a } = await import("./a.js");
	const { b } = await import("./b.js");
	parentPort.postMessage(`worker:${a}${b}`);
});
