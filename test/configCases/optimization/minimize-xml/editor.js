it("should emit the SVG after removing optional data", () => {
	expect(new URL("./editor.svg", import.meta.url).href).toMatch(/\.svg$/);
});
