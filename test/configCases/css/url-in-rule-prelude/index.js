import "./style.css";

it("resolves the url in a prelude a stray declaration makes", () => {
	// The emitted stylesheet is asserted in test.config.js (afterExecute); this
	// keeps a runnable entry so the chunk and its `.css` are produced.
	expect(true).toBe(true);
});
