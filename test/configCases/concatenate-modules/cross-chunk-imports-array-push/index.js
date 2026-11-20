it("should keep shared modules in the registry for array-push chunks", () => {
	// the pages are only built: their chunks need a document to load, and
	// test.config.js (afterExecute) reads what they hold
	if (globalThis.loadCrossChunkImportsPages) {
		import(/* webpackChunkName: "page-a" */ "./page-a.js");
		import(/* webpackChunkName: "page-b" */ "./page-b.js");
	}
	expect(true).toBe(true);
});
