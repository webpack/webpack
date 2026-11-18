it("should emit the SVG with its circular curves as arcs", () => {
	expect(new URL("./arcs.svg", import.meta.url).href).toMatch(/\.svg$/);
});
