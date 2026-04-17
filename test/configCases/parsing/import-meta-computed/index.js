it("should support computed property access with literal string on import.meta", () => {
	const url = import.meta.url;
	expect(import.meta["url"]).toBe(url);
});

it("should support computed property access with template string on import.meta", () => {
	const url = import.meta.url;
	expect(import.meta[`url`]).toBe(url);
});

it("should support computed property access with string concatenation on import.meta", () => {
	const url = import.meta.url;
	expect(import.meta["u" + "rl"]).toBe(url);
});

it("should support computed property access on import.meta.webpackHot", () => {
	if (import.meta.webpackHot) {
		expect(import.meta["webpackHot"]).toBe(import.meta.webpackHot);
	}
});
