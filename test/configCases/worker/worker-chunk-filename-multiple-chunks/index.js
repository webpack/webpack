import { Worker } from "worker_threads";

it("should keep chunkFilename for every chunk a worker loads, workerChunkFilename only for its entry", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("worker:AB");
	await worker.terminate();
});
