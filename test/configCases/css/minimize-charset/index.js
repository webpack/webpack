import "./style.css";

it("should emit the stylesheet the option is read for", () => {
	// The emitted stylesheet is checked in test.config.js (afterExecute); this
	// keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
