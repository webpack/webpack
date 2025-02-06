import { default as Worker } from './worker-wrapper';

it("should allow to load chunk in blob", async () => {
	const worker = new Worker(new URL('./worker.js', import.meta.url)).getWorker();
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: 3, protocol: blob:, thanks");
	await worker.terminate();
});

