// a bare side-effect import: no export of w.js is used in this runtime either
import "./w.js";

it("should use the global scope in the worker role even when exports are unused everywhere", async () => {
	const worker = new Worker(new URL("./w.js", import.meta.url));
	worker.postMessage("hello");
	const result = await new Promise(resolve => {
		worker.onmessage = event => resolve(event.data);
	});
	expect(result).toBe("got hello");
	await worker.terminate();
});
