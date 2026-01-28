const isMain = typeof window !== "undefined";

if (isMain) {
	it("should allow to import itself", async () => {
		const worker = new Worker(import.meta.url);
		worker.postMessage("ok");
		const result = await new Promise(resolve => {
			worker.onmessage = event => {
				resolve(event.data);
			};
		});
		expect(result).toBe("data: OK, thanks");
		await worker.terminate();
	});

	it("should allow to import itself", async () => {
		const worker = new Worker(new URL(import.meta.url));
		worker.postMessage("ok");
		const result = await new Promise(resolve => {
			worker.onmessage = event => {
				resolve(event.data);
			};
		});
		expect(result).toBe("data: OK, thanks");
		await worker.terminate();
	});
}

self.onmessage = async event => {
	const { upper } = await import("./module");
	postMessage(`data: ${upper(event.data)}, thanks`);
};
