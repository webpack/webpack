"use strict";

const ArrayHelpers = require("../lib/util/ArrayHelpers");

describe("ArrayHelpers", () => {
	it("groupBy should partition into two arrays", () => {
		expect(
			ArrayHelpers.groupBy([1, 2, 3, 4, 5, 6], x => x % 2 === 0)
		).toStrictEqual([
			[2, 4, 6],
			[1, 3, 5]
		]);
	});
	it("groupBy works with empty array", () => {
		expect(ArrayHelpers.groupBy([], x => x % 2 === 0)).toStrictEqual([[], []]);
	});
});
