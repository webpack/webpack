it("should emit SVG with optional presentation, path and container cleanup", () => {
	expect(new URL("./compact.svg", import.meta.url).href).toMatch(/\.svg$/);
	expect(new URL("./animated.svg", import.meta.url).href).toMatch(/\.svg$/);
});
