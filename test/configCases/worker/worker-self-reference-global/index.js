it("should allow worker to import CJS module with self-reference when usedExports is global", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result.value).toBe(42);
	await worker.terminate();
});
