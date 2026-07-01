it("should not throw on load from an unguarded `self` in node", () => {
	// an unguarded `self` (undefined in node) throws at load; reaching here proves there is none.
	expect(hello()).toBe("hello");
});

export function hello() {
	return "hello";
}
