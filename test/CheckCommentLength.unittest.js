"use strict";

const { overLimit } = require("../tooling/check-comment-length");

/**
 * @param {string[]} lines added lines, without the `+`
 * @returns {string[]} what the checker reports for them
 */
const check = (lines) =>
	overLimit(
		[
			"--- a/x.js",
			"+++ b/x.js",
			`@@ -0,0 +1,${lines.length} @@`,
			...lines.map((one) => `+${one}`)
		].join("\n")
	);

describe("check-comment-length", () => {
	it("reports a line comment run past two lines", () => {
		expect(check(["// one", "// two", "// three", "const a = 1;"])).toEqual([
			"x.js:1"
		]);
	});

	it("accepts a run of exactly two", () => {
		expect(check(["// one", "// two", "const a = 1;"])).toEqual([]);
	});

	it("reports a block comment past two lines", () => {
		expect(check(["/* one", "   two", "   three */"])).toEqual(["x.js:1"]);
	});

	it("accepts a block comment of two lines, and of one", () => {
		expect(check(["/* one", "   two */", "/* just the one */"])).toEqual([]);
	});

	it("exempts a JSDoc block however long", () => {
		expect(
			check([
				"/**",
				" * A description.",
				" * @param {string} x the thing",
				" * @returns {number} the other",
				" */",
				"const f = (x) => 1;"
			])
		).toEqual([]);
	});

	it("exempts the license header every source file opens with", () => {
		expect(
			check([
				"/*",
				"\tMIT License http://www.opensource.org/licenses/mit-license.php",
				"\tAuthor Someone @someone",
				"*/",
				'"use strict";'
			])
		).toEqual([]);
	});

	it("still reads a comment following the license header", () => {
		expect(
			check([
				"/*",
				"\tMIT License http://www.opensource.org/licenses/mit-license.php",
				"*/",
				"// one",
				"// two",
				"// three"
			])
		).toEqual(["x.js:4"]);
	});

	it("exempts an inline `/** @type */` cast", () => {
		expect(check(["/** @type {string} */ (x);"])).toEqual([]);
	});

	it("counts each run on its own, and reports where it starts", () => {
		expect(
			check([
				"const a = 1;",
				"// one",
				"// two",
				"// three",
				"const b = 2;",
				"// four",
				"// five",
				"// six"
			])
		).toEqual(["x.js:2", "x.js:6"]);
	});

	it("reads nothing out of a removed or unchanged line", () => {
		expect(
			overLimit(
				[
					"--- a/x.js",
					"+++ b/x.js",
					"@@ -1,3 +1,1 @@",
					"-// one",
					"-// two",
					"-// three",
					"+const a = 1;"
				].join("\n")
			)
		).toEqual([]);
	});

	it("names the file each run is in", () => {
		expect(
			overLimit(
				[
					"--- a/one.js",
					"+++ b/one.js",
					"@@ -0,0 +4,3 @@",
					"+// a",
					"+// b",
					"+// c",
					"--- a/two.js",
					"+++ b/two.js",
					"@@ -0,0 +9,3 @@",
					"+/* a",
					"+   b",
					"+   c */"
				].join("\n")
			)
		).toEqual(["one.js:4", "two.js:9"]);
	});
});
