import "./page.html";

it("should minify the handlers", () => {
	// The emitted page is snapshotted in test.config.js (afterExecute); this
	// keeps a runnable entry so the chunk (and its `.html`) is produced.
	expect(true).toBe(true);
});
