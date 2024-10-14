it("should handle import.meta.url in URL()", () => {
	const {href} = new URL("./file.text", import.meta.url);

	expect(href).toBe("https://test.cases/path/file.text");
});
