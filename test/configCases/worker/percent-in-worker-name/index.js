it("should start a worker whose chunk name holds a percent sign", async () => {
	const worker = new Worker(
		/* webpackChunkName: "w%41" */ new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("ok");
	const result = await new Promise((resolve) => {
		worker.onmessage = (event) => {
			resolve(event.data);
		};
	});
	expect(result).toBe("ok: 42");
	await worker.terminate();
});
