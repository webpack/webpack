/* javascript minify excluded marker */
import "./page.html";
import "./style.css";

it("should minimize only the types `optimization.minimize` does not exclude", () => {
	// The emitted files are the assertion — see test.config.js (afterExecute).
	expect(true).toBe(true);
});
