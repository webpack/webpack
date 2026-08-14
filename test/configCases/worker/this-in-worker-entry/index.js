it("should let a worker entry use top-level this as its global scope", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("got hello");
	await worker.terminate();
});
