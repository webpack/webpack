"use strict";

const ArrayHelpers = require("../lib/util/ArrayHelpers");

describe("ArrayHelpers", () => {
	it("equals returns true for arrays with strictly equal items", () => {
		expect(ArrayHelpers.equals([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(ArrayHelpers.equals([], [])).toBe(true);
	});

	it("equals returns false for different lengths or items", () => {
		expect(ArrayHelpers.equals([1, 2, 3], [1, 2])).toBe(false);
		expect(ArrayHelpers.equals([1, 2, 3], [1, 2, 4])).toBe(false);
		expect(ArrayHelpers.equals(["1"], [1])).toBe(false);
	});
});
