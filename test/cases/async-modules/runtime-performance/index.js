it("should not take too long to evaluate nested async modules", async () => {
	const start = Date.now();
	await import(/* webpackMode: "eager" */ "./loader.js?i=40!./loader.js");
	// Memoized evaluation is a few ms; a regression re-walking the async DAG per
	// path is exponential and hangs. Generous budget catches that without
	// flaking on the 100ms edge when a loaded CI runner starves microtasks.
	expect(Date.now() - start).toBeLessThan(2000);
});
