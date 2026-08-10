/* comment marker the minifier drops */
const importantMarkerValue = "important-marker-value";

it("should hand `optimization.minimize.javascript` to the JS minimizer", () => {
	// `mangle: false` keeps the name above readable in the emitted bundle;
	// test.config.js (afterExecute) asserts on the file.
	expect(importantMarkerValue).toBe("important-marker-value");
});
