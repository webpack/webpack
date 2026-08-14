it("should keep exports semantics where the file is imported", () => {
	const shared = require("./shared.js");
	expect(shared.marker).toBe("assigned");
	expect(typeof shared.onmessage).toBe("function");
});

it("should use the global scope where the same file is a worker entry", async () => {
	const worker = new Worker(new URL("./shared.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("hello:assigned");
	await worker.terminate();
});
