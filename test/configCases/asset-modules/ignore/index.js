const url = new URL("image.png", import.meta.url);

it("should output asset with path", () => {
	expect(url + "").toBe("data:,");
});
