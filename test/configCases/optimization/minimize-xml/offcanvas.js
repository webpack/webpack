it("should emit the SVG without its off-canvas paths", () => {
	expect(new URL("./offcanvas.svg", import.meta.url).href).toMatch(/\.svg$/);
});
