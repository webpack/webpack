"use strict";

const should = require("should");
const compareLocations = require("../lib/compareLocations");
const createPosition = function(overrides) {
	return Object.assign(
		{
			line: 10,
			column: 5
		},
		overrides
	);
};

const createLocation = function(start, end, index) {
	return {
		start: createPosition(start),
		end: createPosition(end),
		index: index || 3
	};
};

describe("compareLocations", () => {
	describe("string location comparison", () => {
		it("returns -1 when the first string comes before the second string", () =>
			compareLocations("alpha", "beta").should.be.exactly(-1));

		it("returns 1 when the first string comes after the second string", () =>
			compareLocations("beta", "alpha").should.be.exactly(1));

		it("returns 0 when the first string is the same as the second string", () =>
			compareLocations("charlie", "charlie").should.be.exactly(0));
	});

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
				return compareLocations(a, b).should.be.exactly(-1);
			});

			it("returns 1 when the first location line number comes after the second location line number", () =>
				compareLocations(b, a).should.be.exactly(1));
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

			it("returns -1 when the first location column number comes before the second location column number", () =>
				compareLocations(a, b).should.be.exactly(-1));

			it("returns 1 when the first location column number comes after the second location column number", () =>
				compareLocations(b, a).should.be.exactly(1));
		});

		describe("location index number", () => {
			beforeEach(() => {
				a = createLocation(null, null, 10);
				b = createLocation(null, null, 20);
			});

			it("returns -1 when the first location index number comes before the second location index number", () =>
				compareLocations(a, b).should.be.exactly(-1));

			it("returns 1 when the first location index number comes after the second location index number", () =>
				compareLocations(b, a).should.be.exactly(1));
		});

		describe("same location", () => {
			beforeEach(() => {
				a = createLocation();
				b = createLocation();
			});

			it("returns 0", () => {
				compareLocations(a, b).should.be.exactly(0);
			});
		});
	});

	describe("string and object location comparison", () => {
		it("returns 1 when the first parameter is a string and the second parameter is an object", () =>
			compareLocations("alpha", createLocation()).should.be.exactly(1));

		it("returns -1 when the first parameter is an object and the second parameter is a string", () =>
			compareLocations(createLocation(), "alpha").should.be.exactly(-1));
	});

	describe("unknown location type comparison", () => {
		it("returns 0 when the first parameter is an object and the second parameter is a number", () =>
			compareLocations(createLocation(), 123).should.be.exactly(0));

		it("returns undefined when the first parameter is a number and the second parameter is an object", () =>
			should(compareLocations(123, createLocation())).be.undefined());

		it("returns 0 when the first parameter is a string and the second parameter is a number", () =>
			compareLocations("alpha", 123).should.be.exactly(0));

		it("returns undefined when the first parameter is a number and the second parameter is a string", () =>
			should(compareLocations(123, "alpha")).be.undefined());

		it("returns undefined when both the first parameter and the second parameter is a number", () =>
			should(compareLocations(123, 456)).be.undefined());
	});
});
