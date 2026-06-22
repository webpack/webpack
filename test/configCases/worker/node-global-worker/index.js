it("should resolve a global `new Worker` to worker_threads on node", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		// node `worker_threads` exposes `.on`
		worker.on("message", resolve);
		worker.on("error", reject);
		worker.postMessage("ok");
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});
