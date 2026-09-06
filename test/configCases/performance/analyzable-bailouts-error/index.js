const url = new URL("./file.txt", import.meta.url);

it("should report through the error channel", () => {
	expect(url.href).toMatch(/\.txt$/);
});
