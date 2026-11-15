it("should keep top-level this as exports in a module a worker requires", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("hello:exported:undefined");
	await worker.terminate();
});
