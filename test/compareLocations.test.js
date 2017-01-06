var should = require("should");
var compareLocations = require("../lib/compareLocations");
var createLocation = function(overides) {
	return Object.assign({
		line: 10,
		column: 5,
		index: 3
	}, overides);
};

describe('compareLocations', function() {
	describe('string location comparison', function() {
		it('returns -1 when the first string comes before the second string', function() {
			compareLocations('alpha', 'beta').should.be.exactly(-1);
		});

		it('returns 1 when the first string comes after the second string', function() {
			compareLocations('beta', 'alpha').should.be.exactly(1);
		});

		it('returns 0 when the first string is the same as the second string', function() {
			compareLocations('charlie', 'charlie').should.be.exactly(0);
		});
	});

	describe('object location comparison', function() {
		var a, b;

		describe('location line number', function() {
			beforeEach(function() {
				a = createLocation({
					line: 10
				});
				b = createLocation({
					line: 20
				});
			});

			it('returns -1 when the first location line number comes before the second location line number', function() {
				compareLocations(a, b).should.be.exactly(-1);
			});

			it('returns 1 when the first location line number comes after the second location line number', function() {
				compareLocations(b, a).should.be.exactly(1);
			});
		});

		describe('location column number', function() {
			beforeEach(function() {
				a = createLocation({
					column: 10
				});
				b = createLocation({
					column: 20
				});
			});

			it('returns -1 when the first location column number comes before the second location column number', function() {
				compareLocations(a, b).should.be.exactly(-1);
			});

			it('returns 1 when the first location column number comes after the second location column number', function() {
				compareLocations(b, a).should.be.exactly(1);
			});
		});

		describe('location index number', function() {
			beforeEach(function() {
				a = createLocation({
					index: 10
				});
				b = createLocation({
					index: 20
				});
			});

			it('returns -1 when the first location index number comes before the second location index number', function() {
				compareLocations(a, b).should.be.exactly(-1);
			});

			it('returns 1 when the first location index number comes after the second location index number', function() {
				compareLocations(b, a).should.be.exactly(1);
			});
		});

		describe('same location', function() {
			beforeEach(function() {
				a = createLocation();
				b = createLocation();
			});

			it('returns 0', function() {
				compareLocations(a, b).should.be.exactly(0);
			});
		});

		describe('start location set', function() {
			beforeEach(function() {
				a = {
					start: createLocation({
						line: 10
					})
				};
				b = {
					start: createLocation({
						line: 20
					})
				};
			});

			it('returns -1 when the first location line number comes before the second location line number', function() {
				compareLocations(a, b).should.be.exactly(-1);
			});

			it('returns 1 when the first location line number comes after the second location line number', function() {
				compareLocations(b, a).should.be.exactly(1);
			});
		});
	});

	describe('string and object location comparison', function() {
		it('returns 1 when the first parameter is a string and the second parameter is an object', function() {
			compareLocations('alpha', createLocation()).should.be.exactly(1);
		});

		it('returns -1 when the first parameter is an object and the second parameter is a string', function() {
			compareLocations(createLocation(), 'alpha').should.be.exactly(-1);
		});
	});

	describe('unknown location type comparison', function() {
		it('returns 0 when the first parameter is an object and the second parameter is a number', function() {
			compareLocations(createLocation(), 123).should.be.exactly(0);
		});

		it('returns undefined when the first parameter is a number and the second parameter is an object', function() {
			should(compareLocations(123, createLocation())).be.undefined();
		});

		it('returns 0 when the first parameter is a string and the second parameter is a number', function() {
			compareLocations('alpha', 123).should.be.exactly(0);
		});

		it('returns undefined when the first parameter is a number and the second parameter is a string', function() {
			should(compareLocations(123, 'alpha')).be.undefined();
		});

		it('returns undefined when both the first parameter and the second parameter is a number', function() {
			should(compareLocations(123, 456)).be.undefined();
		});
	});
});
