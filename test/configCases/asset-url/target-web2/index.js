it("should handle import.meta.url in URL()", () => {
	const { href } = new URL("./a.js", import.meta.url);

	expect(href).toBe("https://test.cases/path2/a.js");
});

it("should handle relative paths in URL()", () => {
	const { href } = new URL("a.js", import.meta.url);

	expect(href).toBe("https://test.cases/path2/a.js");
});
