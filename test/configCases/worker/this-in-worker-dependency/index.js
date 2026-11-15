it("should keep top-level this as exports in a module a worker requires", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("hello:exported:undefined");
	await worker.terminate();
});

it("should keep top-level this as exports in a worker entry another worker in its runtime requires", async () => {
	const workerA = new Worker(
		/* webpackEntryOptions: { runtime: "shared-worker" } */
		new URL("./worker-a.js", import.meta.url)
	);
	const workerB = new Worker(
		/* webpackEntryOptions: { runtime: "shared-worker" } */
		new URL("./worker-b.js", import.meta.url)
	);
	workerB.postMessage("b");
	const result = await new Promise(resolve => {
		workerB.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("b:from-a");
	await workerA.terminate();
	await workerB.terminate();
});
