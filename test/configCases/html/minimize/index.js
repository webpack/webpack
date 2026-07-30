import "./page.html";

it("should safely minify emitted HTML when optimization.minimize is enabled", () => {
	// The assertions on the emitted file live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunk (and its `.html`) is produced.
	expect(true).toBe(true);
});
