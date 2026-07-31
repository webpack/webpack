import "./style.css";
import "./page.html";

it("should leave both types to one minimizer that covers them", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunks are produced.
	expect(true).toBe(true);
});
