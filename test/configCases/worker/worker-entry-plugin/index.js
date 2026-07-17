it("should execute modules injected via WorkerEntryPlugin inside the worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("run");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	// `injected.js` ran exactly once as an entry module of the worker
	expect(result).toBe(1);
	await worker.terminate();
});
