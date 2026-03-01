import { Worker } from "worker_threads";

it("should build and run when worker is an entry and using via `new Worker(...)`", async () => {
	const worker = new Worker(
		/* webpackChunkName: "my-worker" */ new URL("./worker.js", import.meta.url)
	);
	worker.postMessage({ data: "ping" });
	const result = await new Promise(resolve => {
		worker.on("message", event => {
			resolve(event.data);
		});
	});
	expect(result).toBe("pong");
	await worker.terminate();
});
