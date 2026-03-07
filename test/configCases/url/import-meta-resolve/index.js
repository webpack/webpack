it("should resolve asset url with import.meta.resolve", () => {
	const url = import.meta.resolve("./file.json");
	expect(typeof url).toBe("string");
	expect(url).toMatch(/file\.json$/);
});

it("should return a different url for different assets", () => {
	const url1 = import.meta.resolve("./file.json");
	const url2 = import.meta.resolve("./other.json");
	expect(url1).not.toBe(url2);
	expect(url1).toMatch("file.json");
	expect(url2).toMatch("other.json");
});
