import "./style.css";

it("should leave every spelling the target cannot read as it was written", () => {
	// The emitted stylesheet is snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
