it("should load in node without referencing `self`", () => {
	// If output.globalObject were `self`, the UMD wrapper `})(self, …)` and the
	// `global` library's `self.MyLibrary = …` would throw `self is not defined`
	// at load in node, before this runs. Reaching here proves `globalThis` was used.
	expect(hello()).toBe("hello");
});

export function hello() {
	return "hello";
}
