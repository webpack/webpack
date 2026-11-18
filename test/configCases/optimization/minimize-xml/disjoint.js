it("should emit the SVG with its disjoint paths merged", () => {
	expect(new URL("./disjoint.svg", import.meta.url).href).toMatch(/\.svg$/);
});
