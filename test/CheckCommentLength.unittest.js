/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { overLimit } = require("../tooling/check-comment-length");

/**
 * @param {string[]} lines the file's lines, every one of them added
 * @param {number=} start the line the hunk opens at
 * @returns {string} a diff naming each line as added
 */
const diff = (lines, start = 1) =>
	`--- a/x.js\n+++ b/x.js\n@@ -0,0 +${start},${lines.length} @@\n${lines
		.map((line) => `+${line}`)
		.join("\n")}`;

describe("check-comment-length", () => {
	it("should accept a comment at the limit", () => {
		expect(overLimit(diff(["const x = 1;", "// a", "// b", "// c"]))).toEqual(
			[]
		);
	});

	it("should report a comment over the limit", () => {
		expect(
			overLimit(diff(["const x = 1;", "// a", "// b", "// c", "// d"]))
		).toEqual(["x.js:2"]);
	});

	it("should report a block comment over the limit", () => {
		expect(
			overLimit(diff(["const x = 1;", "/*", " a", " b", " c", " d", "*/"]))
		).toEqual(["x.js:2"]);
	});

	it("should exempt a run opening with the marker", () => {
		expect(
			overLimit(diff(["const x = 1;", "// WHY: a", "// b", "// c", "// d"]))
		).toEqual([]);
	});

	it("should report a later run the marker does not open", () => {
		expect(
			overLimit(
				diff(["const x = 1;", "// WHY: a", "", "// p", "// q", "// r", "// s"])
			)
		).toEqual(["x.js:4"]);
	});

	it("should exempt the file preamble in either form", () => {
		const lines = ["// a", "// b", "// c", "// d", "", "const x = 1;"];
		expect(overLimit(diff(lines))).toEqual([]);
		expect(
			overLimit(diff(["/*", " a", " b", " c", " d", "*/", "const x = 1;"]))
		).toEqual([]);
		expect(overLimit(diff(lines, 900))).toEqual(["x.js:900"]);
	});

	it("should carry the preamble past the strict-mode directive", () => {
		expect(
			overLimit(
				diff([
					'"use strict";',
					"",
					"// a",
					"// b",
					"// c",
					"// d",
					"",
					"const x = 1;"
				])
			)
		).toEqual([]);
	});

	it("should end the preamble at the first statement", () => {
		expect(
			overLimit(
				diff(['"use strict";', "const x = 1;", "// a", "// b", "// c", "// d"])
			)
		).toEqual(["x.js:3"]);
	});

	it("should exempt JSDoc", () => {
		expect(
			overLimit(
				diff(["const x = 1;", "/**", " * a", " * b", " * c", " * d", " */"])
			)
		).toEqual([]);
	});

	it("should exempt the license header", () => {
		expect(
			overLimit(
				diff([
					"const x = 1;",
					"/*",
					" MIT License http://x",
					" a",
					" b",
					" c",
					"*/"
				])
			)
		).toEqual([]);
	});
});
