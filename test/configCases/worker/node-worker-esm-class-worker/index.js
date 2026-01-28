import { Worker } from "worker_threads";

it("should support class worker chunk in Node.js", async () => {
	const worker = new Worker(new URL("./worker.js" + __resourceQuery, import.meta.url));

	const promise = new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
	});

	worker.postMessage("hello");

	const result = await promise;
	expect(result).toBe("hello from worker with ESM import");

	await worker.terminate();
});
