const cases = require.context("./cases", false, /\.html$/);

for (const file of cases.keys()) {
	cases(file);
}

it("should keep every corpus document's tree through minification", () => {
	// The comparison runs in test.config.js (afterExecute), where the emitted
	// files exist; this keeps a runnable entry so they are produced.
	expect(cases.keys().length).toBeGreaterThan(0);
});
