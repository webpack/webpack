const url = new URL("./file.txt", import.meta.url);

// Never called: the worker only has to exist for its chunk loading to be asked.
export const startWorker = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

it("should still resolve the asset through the runtime form", () => {
	expect(url.href).toMatch(/\.txt$/);
});
