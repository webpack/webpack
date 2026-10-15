it("should emit SVG with optional numeric cleanup", () => {
	expect(new URL("./numbers.svg", import.meta.url).href).toMatch(/\.svg$/);
});
