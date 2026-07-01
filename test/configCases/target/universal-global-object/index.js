it("should load in node without referencing `self`", () => {
	// `self` (undefined in node) would throw at load; reaching here proves it isn't referenced.
	expect(hello()).toBe("hello");
});

export function hello() {
	return "hello";
}
