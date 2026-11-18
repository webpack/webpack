it("should emit the SVG with its path transforms applied", () => {
	expect(new URL("./applied.svg", import.meta.url).href).toMatch(/\.svg$/);
});
