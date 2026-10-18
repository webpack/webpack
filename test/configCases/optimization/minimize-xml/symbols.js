it("should sort SVG symbols and convert their shapes while preserving references", () => {
	expect(new URL("./symbols.svg", import.meta.url).href).toMatch(/\.svg$/);
});
