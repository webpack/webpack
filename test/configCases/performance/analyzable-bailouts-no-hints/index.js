const url = new URL("./file.txt", import.meta.url);

it("should stay quiet when hints are off", () => {
	expect(url.href).toMatch(/\.txt$/);
	expect(__STATS__.hints).toHaveLength(0);
});
