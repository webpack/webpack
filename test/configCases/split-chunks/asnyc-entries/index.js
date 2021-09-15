import { Worker } from "worker_threads";

it("should generate valid code when entrypoints are flagged side-effect-free", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, value: 42, thanks");
	await worker.terminate();
});
