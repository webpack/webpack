it("should handle import.meta.url in URL()", () => {
	const { href } = new URL("./inner/a.js", import.meta.url);

	expect(href).toBe("https://test.cases/custom/inner/a.js");
});
