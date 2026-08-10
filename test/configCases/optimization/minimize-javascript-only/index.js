/* javascript minify marker */
import "./page.html";
import "./style.css";

it("should fall back to the plain JS minimizer when CSS and HTML are excluded", () => {
	// The emitted files are the assertion — see test.config.js (afterExecute).
	expect(true).toBe(true);
});
