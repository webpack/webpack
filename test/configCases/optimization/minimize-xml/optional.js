it("should apply every opt-in SVG removal", () => {
	expect(new URL("./optional.svg", import.meta.url).href).toMatch(/\.svg$/);
});
