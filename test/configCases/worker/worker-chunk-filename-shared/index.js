import { Worker } from "worker_threads";

it("should name worker-only chunks with workerChunkFilename and shared chunks with chunkFilename", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("worker:WO");
	await worker.terminate();

	const { value } = await import("./main-only.js");
	expect(value).toBe("MO");
	await import("./shared.js");
});
