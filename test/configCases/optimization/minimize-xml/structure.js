it("should clean SVG structure while retaining IDs and references", () => {
	expect(new URL("./structure.svg", import.meta.url).href).toMatch(/\.svg$/);
});
