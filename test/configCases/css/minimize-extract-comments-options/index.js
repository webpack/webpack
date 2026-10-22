import "./style.css";

it("should move the comments the predicate picks out of the stylesheet", () => {
	// The emitted assets are read in test.config.js (afterExecute); this keeps
	// a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
