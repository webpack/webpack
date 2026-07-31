import "./style.css";

it("should leave CSS to the minimizer the user configured", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunk is produced.
	expect(true).toBe(true);
});
