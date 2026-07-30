import "./style.css";

it("should safely minify emitted CSS when optimization.minimize is enabled", () => {
	// The assertions on the emitted file live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunk is produced.
	expect(true).toBe(true);
});
