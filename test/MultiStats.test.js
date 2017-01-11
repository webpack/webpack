var should = require("should");
var sinon = require("sinon");
var package = require("../package.json");
var MultiStats = require("../lib/MultiStats");

var createStat = function(overides) {
	return Object.assign({
		hash: "foo",
		compilation: {
			name: "bar"
		},
		hasErrors: () => false,
		hasWarnings: () => false,
		toJson: () => Object.assign({
			hash: "foo",
			version: "version",
			warnings: [],
			errors: []
		}, overides)
	}, overides);
};

describe("MultiStats", function() {
	var packageVersion, stats, myMultiStats, result;

	beforeEach(function() {
		packageVersion = package.version;
		package.version = "1.2.3";
	});

	afterEach(function() {
		package.version = packageVersion;
	});

	describe("created", function() {
		beforeEach(function() {
			stats = [
				createStat({
					hash: "abc123"
				}),
				createStat({
					hash: "xyz890"
				})
			];
			myMultiStats = new MultiStats(stats);
		});

		it("creates a hash string", function() {
			myMultiStats.hash.should.be.exactly("abc123xyz890");
		});
	});

	describe("hasErrors", function() {
		describe("when both have errors", function() {
			beforeEach(function() {
				stats = [
					createStat({
						hasErrors: () => true
					}),
					createStat({
						hasErrors: () => true
					})
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", function() {
				myMultiStats.hasErrors().should.be.exactly(true);
			});
		});

		describe("when one has an error", function() {
			beforeEach(function() {
				stats = [
					createStat({
						hasErrors: () => true
					}),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", function() {
				myMultiStats.hasErrors().should.be.exactly(true);
			});
		});

		describe("when none have errors", function() {
			beforeEach(function() {
				stats = [
					createStat(),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns false", function() {
				myMultiStats.hasErrors().should.be.exactly(false);
			});
		});
	});

	describe("hasWarnings", function() {
		describe("when both have warnings", function() {
			beforeEach(function() {
				stats = [
					createStat({
						hasWarnings: () => true
					}),
					createStat({
						hasWarnings: () => true
					})
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", function() {
				myMultiStats.hasWarnings().should.be.exactly(true);
			});
		});

		describe("when one has a warning", function() {
			beforeEach(function() {
				stats = [
					createStat({
						hasWarnings: () => true
					}),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", function() {
				myMultiStats.hasWarnings().should.be.exactly(true);
			});
		});

		describe("when none have warnings", function() {
			beforeEach(function() {
				stats = [
					createStat(),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns false", function() {
				myMultiStats.hasWarnings().should.be.exactly(false);
			});
		});
	});

	describe("toJson", function() {
		beforeEach(function() {
			stats = [
				createStat({
					hash: "abc123",
					compilation: {
						name: "abc123-compilation"
					},
					toJson: () => ({
						warnings: ["abc123-warning"],
						errors: ["abc123-error"]
					})
				}),
				createStat({
					hash: "xyz890",
					compilation: {
						name: "xyz890-compilation"
					},
					toJson: () => ({
						warnings: ["xyz890-warning-1", "xyz890-warning-2"],
						errors: []
					})
				})
			];
			myMultiStats = new MultiStats(stats);
			result = myMultiStats.toJson({
				version: false,
				hash: false
			});
		});

		it("returns plain object representation", function() {
			result.should.deepEqual({
				errors: [
					"(abc123-compilation) abc123-error"
				],
				warnings: [
					"(abc123-compilation) abc123-warning",
					"(xyz890-compilation) xyz890-warning-1",
					"(xyz890-compilation) xyz890-warning-2"
				],
				children: [{
						errors: [
							"abc123-error"
						],
						name: "abc123-compilation",
						warnings: [
							"abc123-warning"
						]
					},
					{
						errors: [],
						name: "xyz890-compilation",
						warnings: [
							"xyz890-warning-1",
							"xyz890-warning-2"
						]
					}
				]
			});
		});
	});

	describe("toString", function() {
		beforeEach(function() {
			stats = [
				createStat({
					hash: "abc123",
					compilation: {
						name: "abc123-compilation"
					}
				}),
				createStat({
					hash: "xyz890",
					compilation: {
						name: "xyz890-compilation"
					}
				})
			];
			myMultiStats = new MultiStats(stats);
			result = myMultiStats.toString();
		});

		it("returns string representation", function() {
			result.should.be.exactly(
				"Hash: abc123xyz890\n" +
				"Version: webpack 1.2.3\n" +
				"Child abc123-compilation:\n" +
				"    Hash: abc123\n" +
				"Child xyz890-compilation:\n" +
				"    Hash: xyz890"
			);
		});
	});
});
