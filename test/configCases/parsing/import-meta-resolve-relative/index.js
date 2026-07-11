it("should resolve to a relative URL string when url is 'relative'", () => {
	const resolved = import.meta.resolve("./asset.txt");
	expect(typeof resolved).toBe("string");
	expect(resolved).toContain("asset.txt");
	expect(resolved).toBe(new URL("./asset.txt", import.meta.url).href);
});
