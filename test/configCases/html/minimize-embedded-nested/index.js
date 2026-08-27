it("should emit the document the minimizer reached every nested body of", () => {
	// The assertions on the emitted file live in test.config.js (afterExecute).
	expect(new URL("./page.html", import.meta.url)).toBeDefined();
});
