import "./style.css";

it("should minify only the CSS webpack rendered itself", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunk is produced.
	expect(true).toBe(true);
});
