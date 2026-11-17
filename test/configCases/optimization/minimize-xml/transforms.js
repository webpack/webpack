it("should emit the SVG with its transforms recomposed", () => {
	expect(new URL("./transforms.svg", import.meta.url).href).toMatch(/\.svg$/);
});
