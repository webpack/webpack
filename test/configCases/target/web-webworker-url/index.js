it("should resolve URL with import.meta.url", () => {
	const url = new URL("./file.png", import.meta.url);
	expect(url.href).toMatch(/[a-f0-9]+\.png/);
});
