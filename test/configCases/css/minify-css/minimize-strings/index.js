import "./style.css";

it("should minify the corpus", () => {
	// The emitted stylesheets are snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
