import "./other";

it("should keep entry options of a worker to the module that creates it", () => {
	expect(global.workerScriptRan).toBe(undefined);
});

if (global.neverSet) {
	new Worker(new URL("./worker.js", import.meta.url));
}
