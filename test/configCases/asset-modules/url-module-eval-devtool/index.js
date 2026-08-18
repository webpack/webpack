it("should resolve new URL() under an eval devtool", () => {
	// It resolved through the wrapper before, which the drop decision had to agree on.
	const url = new URL("./file.png", import.meta.url);

	expect(url.href).toBe("https://example.com/public/file.png");
});
