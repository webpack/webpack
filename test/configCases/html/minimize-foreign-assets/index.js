import "./page.html";

it("should minify only the HTML webpack rendered itself", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunk (and its `.html`) is produced.
	expect(true).toBe(true);
});
