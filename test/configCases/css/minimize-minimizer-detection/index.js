import "./style.css";
import "./page.html";

it("should ignore configured entries that are not asset minimizers", () => {
	// The assertions on the emitted files live in test.config.js (afterExecute),
	// this keeps a runnable entry so the chunks are produced.
	expect(true).toBe(true);
});
