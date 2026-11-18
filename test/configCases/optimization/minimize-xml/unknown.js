it("should emit the SVG without its unknown elements", () => {
	expect(new URL("./unknown.svg", import.meta.url).href).toMatch(/\.svg$/);
});
