import "./style.css";

it("should minify the corpus", () => {
	// test.config.js (afterExecute) asserts the emitted stylesheet; this keeps a
	// runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
