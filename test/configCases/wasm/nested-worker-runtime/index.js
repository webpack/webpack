it("should load and compile WebAssembly from a nested worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	try {
		const result = await new Promise((resolve, reject) => {
			if (typeof worker.on === "function") {
				worker.on("message", resolve);
				worker.on("error", reject);
			} else {
				worker.onmessage = (event) => resolve(event.data);
				worker.onerror = reject;
			}
		});
		expect(result).toEqual([42, 42]);
	} finally {
		await worker.terminate();
	}
});
