import { Worker } from "worker_threads";

it("should keep parentheses balanced around the worker URL arguments", async () => {
	const worker = new Worker(new URL(("./worker.js"), (import.meta.url)));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: ok");
	await worker.terminate();
});
