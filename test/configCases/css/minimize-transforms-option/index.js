import "./style.css";

it("should make the rewrites the build asked for", () => {
	// The emitted stylesheet is snapshotted in test.config.js (afterExecute);
	// this keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
