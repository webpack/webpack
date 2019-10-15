"use strict";

const { compareLocations } = require("../lib/util/comparators");
const createPosition = overrides => {
	return {
		line: 10,
		column: 5,
		...overrides
	};
};

const createLocation = (start, end, index) => {
	return {
		start: createPosition(start),
		end: createPosition(end),
		index: index || 3
	};
};

describe("compareLocations", () => {
	describe("object location comparison", () => {
		let a, b;

		describe("location line number", () => {
			beforeEach(() => {
				a = createLocation({
					line: 10
				});
				b = createLocation({
					line: 20
				});
			});

			it("returns -1 when the first location line number comes before the second location line number", () => {
				expect(compareLocations(a, b)).toBe(-1);
			});

			it("returns 1 when the first location line number comes after the second location line number", () => {
				expect(compareLocations(b, a)).toBe(1);
			});
		});

		describe("location column number", () => {
			beforeEach(() => {
				a = createLocation({
					column: 10
				});
				b = createLocation({
					column: 20
				});
			});

			it("returns -1 when the first location column number comes before the second location column number", () => {
				expect(compareLocations(a, b)).toBe(-1);
			});

			it("returns 1 when the first location column number comes after the second location column number", () => {
				expect(compareLocations(b, a)).toBe(1);
			});
		});

		describe("location index number", () => {
			beforeEach(() => {
				a = createLocation(null, null, 10);
				b = createLocation(null, null, 20);
			});

			it("returns -1 when the first location index number comes before the second location index number", () => {
				expect(compareLocations(a, b)).toBe(-1);
			});

			it("returns 1 when the first location index number comes after the second location index number", () => {
				expect(compareLocations(b, a)).toBe(1);
			});
		});

		describe("same location", () => {
			beforeEach(() => {
				a = createLocation();
				b = createLocation();
			});

			it("returns 0", () => {
				expect(compareLocations(a, b)).toBe(0);
			});
		});
	});

	describe("unknown location type comparison", () => {
		it("returns 1 when the first parameter is an object and the second parameter is not", () => {
			expect(compareLocations(createLocation(), 123)).toBe(1);
			expect(compareLocations(createLocation(), "alpha")).toBe(1);
		});

		it("returns -1 when the first parameter is not an object and the second parameter is", () => {
			expect(compareLocations(123, createLocation())).toBe(-1);
			expect(compareLocations("alpha", createLocation())).toBe(-1);
		});

		it("returns 0 when both the first parameter and the second parameter are not objects", () => {
			expect(compareLocations(123, 456)).toBe(0);
		});
	});
});
