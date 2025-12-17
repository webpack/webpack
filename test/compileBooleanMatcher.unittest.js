"use strict";

/** @typedef {ReturnType<expect>} ExceptResult */

const { itemsToRegexp } = require("../lib/util/compileBooleanMatcher");

describe("itemsToRegexp", () => {
	/**
	 * @param {string} name name
	 * @param {string | string[]} input input
	 * @param {(e: ExceptResult) => void} fn fn to test
	 */
	const expectCompiled = (name, input, fn) => {
		it(`should compile ${name}`, () => {
			const items = typeof input === "string" ? input.split(",") : input;
			const regexp = itemsToRegexp(items);
			const r = new RegExp(`^${regexp}$`);
			for (const item of items) {
				expect(item).toMatch(r);
			}
			fn(expect(regexp));
		});
	};

	expect.addSnapshotSerializer({
		test() {
			return true;
		},
		/**
		 * @param {unknown} received received
		 * @returns {string} result
		 */
		print(received) {
			return /** @type {string} */ (received);
		}
	});

	expectCompiled("basic", ["abc", "def", "123", "45", "6"], (e) =>
		e.toMatchInlineSnapshot("(123|45|6|abc|def)")
	);

	expectCompiled("single chars", ["a", "b", "c", "1", "2", "3"], (e) =>
		e.toMatchInlineSnapshot("[1-3a-c]")
	);

	expectCompiled("single chars with ranges", ["1", "2", "3", "4", "a"], (e) =>
		e.toMatchInlineSnapshot("[1-4a]")
	);

	expectCompiled(
		"single chars consecutive range",
		["a", "b", "c", "d", "e"],
		(e) => e.toMatchInlineSnapshot("[a-e]")
	);

	expectCompiled(
		"single chars multiple ranges",
		["1", "2", "3", "a", "b", "c", "x", "y", "z"],
		(e) => e.toMatchInlineSnapshot("[1-3a-cx-z]")
	);

	expectCompiled(
		"single chars with gaps",
		["a", "c", "e", "g"],
		// cspell:ignore aceg
		(e) => e.toMatchInlineSnapshot("[aceg]")
	);

	expectCompiled(
		"single chars mixed ranges and singles",
		["1", "2", "3", "5", "7", "8", "9"],
		(e) => e.toMatchInlineSnapshot("[1-357-9]")
	);

	expectCompiled(
		"prefixes",
		["ab1", "ab2", "ab3", "ab4", "de5", "de6", "de7", "ef8", "ef9", "gh0"],
		(e) => e.toMatchInlineSnapshot("(ab[1-4]|de[5-7]|ef[89]|gh0)")
	);

	expectCompiled("short prefixes", "a,ab", (e) =>
		e.toMatchInlineSnapshot("a(|b)")
	);

	expectCompiled(
		"nested prefixes",
		["a", "ab", "abc", "abcd", "abcde", "abcdef"],
		(e) => e.toMatchInlineSnapshot("a(b(c(d(|e|ef)|)|)|)")
	);

	expectCompiled("suffixes", "a1,b1,c1,d1,e1,a2,b2,c2", (e) =>
		e.toMatchInlineSnapshot("([a-e]1|[a-c]2)")
	);

	expectCompiled(
		"common prod",
		"674,542,965,12,942,483,445,943,423,995,434,122,995,248,432,165,436,86,435,221",
		(e) =>
			e.toMatchInlineSnapshot(
				"(1(2|22|65)|4(3[24-6]|23|45|83)|9(42|43|65|95)|221|248|542|674|86)"
			)
	);

	expectCompiled(
		"long strings",
		[
			"./path/to/file.js",
			"./path/to/file.mjs",
			"./path/to/other-file.js",
			"./path/to/directory/with/file.js",
			"./path/to/directory/with/file.json",
			"./path/to/directory/with/file.css",
			"./path/to/directory/with/module.css",
			"webpack/runtime/module"
		],
		(e) =>
			e.toMatchInlineSnapshot(
				"(\\.\\/path\\/to\\/(directory\\/with\\/(file\\.(js(|on)|css)|module\\.css)|file\\.(|m)js|other\\-file\\.js)|webpack\\/runtime\\/module)"
			)
	);

	expectCompiled(
		"prefix and suffix overlap",
		[
			"webpack_sharing_consume_default_react_react",
			"webpack_sharing_consume_default_classnames_classnames-webpack_sharing_consume_default_react_react"
		],
		(e) =>
			e.toMatchInlineSnapshot(
				"webpack_sharing_consume_default_(|classnames_classnames\\-webpack_sharing_consume_default_)react_react"
			)
	);
});
