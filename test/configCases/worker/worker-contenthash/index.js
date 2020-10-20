import { Worker } from "worker_threads";

it("should allow to create a WebWorker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	worker.terminate();
});

it("should allow to share chunks", async () => {
	const { upper } = await import("./module");
	expect(upper("ok")).toBe("OK");
});
