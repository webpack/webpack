const url = new URL("./img.png", import.meta.url);

it("should resolve the asset against the base uri", () => {
	expect(String(url)).toContain("img.png");
});
