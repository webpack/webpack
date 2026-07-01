it("should load in node without referencing `self`", () => {
	// `self` (undefined in node) would throw at load; reaching here proves `globalThis`.
	expect(hello()).toBe("hello");
});

export function hello() {
	return "hello";
}
