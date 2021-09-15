it("should handle import.meta.url in URL()", () => {
	const {href} = new URL("./index.css", import.meta.url);

	expect(href).toBe("https://test.cases/index.css");
});
