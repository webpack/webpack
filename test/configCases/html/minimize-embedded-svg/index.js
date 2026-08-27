const page = require.context("./", false, /\.html$/);

for (const file of page.keys()) {
	page(file);
}

it("should emit the document", () => {
	// The minified asset is read in test.config.js (afterExecute), where the
	// emitted files exist; this keeps a runnable entry so one is produced.
	expect(page.keys().length).toBe(1);
});
