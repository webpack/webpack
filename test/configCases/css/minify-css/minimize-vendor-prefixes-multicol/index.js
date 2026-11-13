import "./style.css";

it("should keep the multi-column prefix for the last release that needs it", () => {
	// The emitted stylesheet is snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
