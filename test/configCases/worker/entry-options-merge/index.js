import { Worker } from "worker_threads";

it("should merge entryOptions when two async blocks share an entrypoint name", async () => {
	const w1 = new Worker(
		/* webpackEntryOptions: { name: "merged", runtime: "merged-rt" } */
		new URL("./worker.js", import.meta.url)
	);
	const w2 = new Worker(
		/* webpackEntryOptions: { name: "merged", runtime: "merged-rt", asyncChunks: false, prototype: { polluted: true }, constructor: { polluted: true } } */
		new URL("./worker.js", import.meta.url)
	);
	expect({}.polluted).toBeUndefined();
	w1.postMessage("a");
	w2.postMessage("b");
	const [r1, r2] = await Promise.all([
		new Promise(resolve => {
			w1.on("message", resolve);
		}),
		new Promise(resolve => {
			w2.on("message", resolve);
		})
	]);
	expect(r1).toBe("got: A");
	expect(r2).toBe("got: B");
	await w1.terminate();
	await w2.terminate();
});
