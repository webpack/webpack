it("should emit the document whose scripts the plugin's terser minified", () => {
	// The assertions on the emitted file live in test.config.js (afterExecute).
	expect(new URL("./page.html", import.meta.url)).toBeDefined();
});
