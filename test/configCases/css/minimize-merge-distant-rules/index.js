import "./style.css";

it("should join a rule, and an at-rule, with a later one past what is between", () => {
	// The emitted stylesheet is snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
