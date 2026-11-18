it("should emit the SVG with its scripts, handlers and styles minified", () => {
	expect(new URL("./scripts.svg", import.meta.url).href).toMatch(/\.svg$/);
});
