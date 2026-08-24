it("should reach a worker entry's global scope as globalThis", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("got hello:defined:globalThis");
	await worker.terminate();
});
