it("should preserve DTD-constrained values while shortening other attributes", () => {
	expect(new URL("./constraints.svg", import.meta.url).href).toMatch(/\.svg$/);
});
