import "./style.css";
import "./page.html";

it("should let a minimizer claim a type through include alone", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunks are produced.
	expect(true).toBe(true);
});
