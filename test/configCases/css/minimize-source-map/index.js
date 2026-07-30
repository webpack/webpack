import "./style.css";

it("should emit a source map for the minified CSS", () => {
	// The source-map assertions live in test.config.js (afterExecute); this keeps
	// a runnable entry so the CSS chunk (and its map) is produced.
	expect(true).toBe(true);
});
