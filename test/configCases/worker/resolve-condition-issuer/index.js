import foo from "foo";

it("should resolve the browser condition outside a worker", () => {
	expect(foo).toBe("index.dom.js");
});

it("should resolve the worker condition for modules a worker imports", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");
	const result = await new Promise((resolve) => {
		worker.onmessage = (event) => {
			resolve(event.data);
		};
	});
	expect(result).toBe("index.worker.js");
	await worker.terminate();
});
