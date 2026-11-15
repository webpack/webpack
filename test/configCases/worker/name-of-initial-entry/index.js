it("should not add the script of a worker named like an entry to that entry", () => {
	expect(global.workerScriptRan).toBe(undefined);
});

if (global.neverSet) {
	new Worker(new URL("./worker.js", import.meta.url), { name: "main" });
}
