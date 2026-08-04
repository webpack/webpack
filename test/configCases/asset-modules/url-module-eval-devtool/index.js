it("should resolve new URL() under an eval devtool", () => {
	// Without the asset's JS wrapper this throws "Cannot find module './file.png'".
	const url = new URL("./file.png", import.meta.url);

	expect(url.href).toBe("https://example.com/public/file.png");
});
