// These functions must stay non-strict so parameters alias `arguments`.
it("should preserve a parameter alias while copying arguments into a sized array", () => {
	const copy = (function (values) {
		for (
			var length = arguments.length, values = Array(length), index = 0;
			index < length;
			index++
		) {
			values[index] = arguments[index];
		}
		return values;
	})(1, 2);
	expect(copy[0]).toBe(copy);
	expect(copy[1]).toBe(2);
});

it("should preserve a parameter alias while copying arguments into an empty array", () => {
	const copy = (function (values) {
		for (var values = [], index = 0; index < arguments.length; index++) {
			values[index] = arguments[index];
		}
		return values;
	})(1, 2);
	expect(copy[0]).toBe(copy);
	expect(copy[1]).toBe(2);
});
