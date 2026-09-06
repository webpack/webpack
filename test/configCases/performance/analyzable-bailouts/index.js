const url = new URL("./file.txt", import.meta.url);

it("should still resolve the asset through the runtime form", () => {
	expect(url.href).toMatch(/\.txt$/);
});
