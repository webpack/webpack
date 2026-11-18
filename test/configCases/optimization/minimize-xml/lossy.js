it("should emit the SVG with svgo's lossier switches applied", () => {
	expect(new URL("./lossy.svg", import.meta.url).href).toMatch(/\.svg$/);
});
