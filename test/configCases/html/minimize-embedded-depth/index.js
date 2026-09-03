it("should emit the document whose nested bodies nest bodies of their own", () => {
	// The assertions on the emitted file live in test.config.js (afterExecute).
	expect(new URL("./page.html", import.meta.url)).toBeDefined();
});
