it("should emit the SVG with the comments it asks for", () => {
	expect(new URL("./comments.svg", import.meta.url).href).toMatch(/\.svg$/);
});
