it("should preserve a built-in assigned through the global object", () => {
	var original = Math.abs;
	try {
		globalThis.Math.abs = function () {
			return 99;
		};
		expect(Math.abs(-1)).toBe(99);
	} finally {
		globalThis.Math.abs = original;
	}
});
