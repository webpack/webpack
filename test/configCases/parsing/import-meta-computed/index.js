it("should support computed property access with literal string on import.meta", () => {
	const url = import.meta.url;
	expect(import.meta["url"]).toBe(url);
});

it("should support computed property access with template string on import.meta", () => {
	const url = import.meta.url;
	expect(import.meta[`url`]).toBe(url);
});
