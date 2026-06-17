it("should allow to create a Worker in node and on the web", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		// node `worker_threads` exposes `.on`, web workers use `onmessage`
		if (typeof worker.on === "function") {
			worker.on("message", resolve);
			worker.on("error", reject);
		} else {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = reject;
		}
		worker.postMessage("ok");
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});

it("should allow to share chunks", async () => {
	const { upper } = await import("./module");
	expect(upper("ok")).toBe("OK");
});
