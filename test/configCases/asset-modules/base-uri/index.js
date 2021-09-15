it("should handle different querystrings for assets correctly", () => {
	__webpack_base_uri__ = "https://example.com";
	const file = new URL("../_images/file.png", import.meta.url);
	expect(file.href).toMatch(/^https:\/\/example.com\/path\/[0-9a-f]+.png$/);
});
