import "./style.css";
import "./page.html";

it("should detect a minimizer added to plugins, per asset type", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunks are produced.
	expect(true).toBe(true);
});
