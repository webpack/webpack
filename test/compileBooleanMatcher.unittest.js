"use strict";

const { itemsToRegexp } = require("../lib/util/compileBooleanMatcher");
describe("itemsToRegexp", () => {
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
		print(received) {
			return received;
		}
	});

	expectCompiled("basic", ["abc", "def", "123", "45", "6"], e =>
		e.toMatchInlineSnapshot(`(123|45|6|abc|def)`)
	);

	expectCompiled("single chars", ["a", "b", "c", "1", "2", "3"], e =>
		e.toMatchInlineSnapshot(`[123abc]`)
	);

	expectCompiled(
		"prefixes",
		["ab1", "ab2", "ab3", "ab4", "de5", "de6", "de7", "ef8", "ef9", "gh0"],
		e => e.toMatchInlineSnapshot(`(ab[1234]|de[567]|ef[89]|gh0)`)
	);

	expectCompiled("short prefixes", "a,ab", e =>
		e.toMatchInlineSnapshot(`a(|b)`)
	);

	expectCompiled(
		"nested prefixes",
		["a", "ab", "abc", "abcd", "abcde", "abcdef"],
		e => e.toMatchInlineSnapshot(`a(b(c(d(|e|ef)|)|)|)`)
	);

	expectCompiled("suffixes", "a1,b1,c1,d1,e1,a2,b2,c2", e =>
		e.toMatchInlineSnapshot(`([abcde]1|[abc]2)`)
	);

	expectCompiled(
		"common prod",
		"674,542,965,12,942,483,445,943,423,995,434,122,995,248,432,165,436,86,435,221",
		e =>
			e.toMatchInlineSnapshot(
				`(1(2|22|65)|4(3[2456]|23|45|83)|9(42|43|65|95)|221|248|542|674|86)`
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
		e =>
			e.toMatchInlineSnapshot(
				`(\\.\\/path\\/to\\/(directory\\/with\\/(file\\.(js(|on)|css)|module\\.css)|file\\.(|m)js|other\\-file\\.js)|webpack\\/runtime\\/module)`
			)
	);

	expectCompiled(
		"prefix and suffix overlap",
		[
			"webpack_sharing_consume_default_react_react",
			"webpack_sharing_consume_default_classnames_classnames-webpack_sharing_consume_default_react_react"
		],
		e =>
			e.toMatchInlineSnapshot(
				`webpack_sharing_consume_default_(|classnames_classnames\\-webpack_sharing_consume_default_)react_react`
			)
	);
});
