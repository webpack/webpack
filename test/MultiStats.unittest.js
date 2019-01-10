"use strict";

const packageJSON = require("../package.json");
const MultiStats = require("../lib/MultiStats");

const createStat = overrides => {
	return Object.assign(
		{
			hash: "foo",
			compilation: {
				name: "bar"
			},
			hasErrors: () => false,
			hasWarnings: () => false,
			toJson: () =>
				Object.assign(
					{
						hash: "foo",
						version: "version",
						warnings: [],
						errors: []
					},
					overrides
				)
		},
		overrides
	);
};

describe("MultiStats", () => {
	let packageVersion, stats, myMultiStats, result;

	beforeEach(() => {
		packageVersion = packageJSON.version;
		packageJSON.version = "1.2.3";
	});

	afterEach(() => {
		packageJSON.version = packageVersion;
	});

	describe("created", () => {
		beforeEach(() => {
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

		it("creates a hash string", () => {
			expect(myMultiStats.hash).toBe("abc123xyz890");
		});
	});

	describe("hasErrors", () => {
		describe("when both have errors", () => {
			beforeEach(() => {
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

			it("returns true", () => {
				expect(myMultiStats.hasErrors()).toBe(true);
			});
		});

		describe("when one has an error", () => {
			beforeEach(() => {
				stats = [
					createStat({
						hasErrors: () => true
					}),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", () => {
				expect(myMultiStats.hasErrors()).toBe(true);
			});
		});

		describe("when none have errors", () => {
			beforeEach(() => {
				stats = [createStat(), createStat()];
				myMultiStats = new MultiStats(stats);
			});

			it("returns false", () => {
				expect(myMultiStats.hasErrors()).toBe(false);
			});
		});
	});

	describe("hasWarnings", () => {
		describe("when both have warnings", () => {
			beforeEach(() => {
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

			it("returns true", () => {
				expect(myMultiStats.hasWarnings()).toBe(true);
			});
		});

		describe("when one has a warning", () => {
			beforeEach(() => {
				stats = [
					createStat({
						hasWarnings: () => true
					}),
					createStat()
				];
				myMultiStats = new MultiStats(stats);
			});

			it("returns true", () => {
				expect(myMultiStats.hasWarnings()).toBe(true);
			});
		});

		describe("when none have warnings", () => {
			beforeEach(() => {
				stats = [createStat(), createStat()];
				myMultiStats = new MultiStats(stats);
			});

			it("returns false", () => {
				expect(myMultiStats.hasWarnings()).toBe(false);
			});
		});
	});

	describe("toJson", () => {
		beforeEach(() => {
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
		});

		it("returns plain object representation", () => {
			myMultiStats = new MultiStats(stats);
			result = myMultiStats.toJson({
				version: false,
				hash: false
			});
			expect(result).toEqual({
				errors: ["(abc123-compilation) abc123-error"],
				warnings: [
					"(abc123-compilation) abc123-warning",
					"(xyz890-compilation) xyz890-warning-1",
					"(xyz890-compilation) xyz890-warning-2"
				],
				children: [
					{
						errors: ["abc123-error"],
						name: "abc123-compilation",
						warnings: ["abc123-warning"]
					},
					{
						errors: [],
						name: "xyz890-compilation",
						warnings: ["xyz890-warning-1", "xyz890-warning-2"]
					}
				]
			});
		});

		it("returns plain object representation with json set to true", () => {
			myMultiStats = new MultiStats(stats);
			result = myMultiStats.toJson(true);
			expect(result).toEqual({
				errors: ["(abc123-compilation) abc123-error"],
				warnings: [
					"(abc123-compilation) abc123-warning",
					"(xyz890-compilation) xyz890-warning-1",
					"(xyz890-compilation) xyz890-warning-2"
				],
				children: [
					{
						warnings: ["abc123-warning"],
						errors: ["abc123-error"],
						name: "abc123-compilation"
					},
					{
						warnings: ["xyz890-warning-1", "xyz890-warning-2"],
						errors: [],
						name: "xyz890-compilation"
					}
				]
			});
		});
	});

	describe("toString", () => {
		beforeEach(() => {
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

		it("returns string representation", () => {
			expect(result).toEqual(
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
