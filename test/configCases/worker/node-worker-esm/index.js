import { Worker } from "worker_threads";

it("should support ESM worker chunks in Node.js", async () => {
	const worker = new Worker(
		new URL("./worker.js" + __resourceQuery, import.meta.url),
		{
			type: "module"
		}
	);

	const promise = new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
	});

	worker.postMessage("hello");

	const result = await promise;
	expect(result).toBe("hello from worker with ESM import");

	await worker.terminate();
});
