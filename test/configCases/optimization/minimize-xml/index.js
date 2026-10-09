it("should emit the SVG asset", () => {
	// The emitted file is snapshotted in test.config.js (afterExecute).
	expect(new URL("./image.svg", import.meta.url).href).toMatch(/\.svg$/);
});
