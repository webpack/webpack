it("should preserve a computed global Object writer", () => {
	var original = Math.abs;
	try {
		globalThis["Object"].defineProperty(Math, "abs", {
			value: function () {
				return 99;
			}
		});
		expect(Math.abs(-1)).toBe(99);
	} finally {
		globalThis["Object"].defineProperty(Math, "abs", { value: original });
	}
});
