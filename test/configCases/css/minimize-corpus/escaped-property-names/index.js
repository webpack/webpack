import "./style.css";

it("should read a property name by what it means, not how it was spelled", () => {
	// The emitted stylesheet is snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
