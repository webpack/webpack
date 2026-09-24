const cases = require.context("./cases", false, /\.html$/);

for (const file of cases.keys()) {
	cases(file);
}

it("should close what the input left open, once", () => {
	// The assertions run in test.config.js (afterExecute), where the emitted
	// files exist; this keeps a runnable entry so they are produced.
	expect(cases.keys().length).toBeGreaterThan(0);
});
