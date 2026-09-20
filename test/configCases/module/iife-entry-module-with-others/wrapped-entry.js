let value = 42;
let wrappedLocal = 1;

it("should keep a wrapped body's global read apart from the entry's declaration", async () => {
	const { default: wrappedValue } = await import(
		/* webpackMode: "eager" */ "./concatenated"
	);
	expect(value).toBe(42);
	expect(wrappedLocal).toBe(1);
	// `typeof value` inside the wrapped body must not see the entry's `value`
	expect(wrappedValue).toBe("undefined");
});
