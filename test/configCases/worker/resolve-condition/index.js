it("should resolve to create a WebWorker", async () => {
	const worker = new Worker(new URL("foo", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");
	const result = await new Promise((resolve) => {
		worker.onmessage = (event) => {
			resolve(event.data);
		};
	});
	expect(result).toBe("index.worker.js");
	await worker.terminate();
});
