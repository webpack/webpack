"use strict";

const identifierUtil = require("../lib/util/identifier");

describe("util/identifier", () => {
	describe("makePathsRelative", () => {
		describe("given a context and a pathConstruct", () => {
			it("computes the correct relative results for the path construct", () => {
				for (const [context, pathConstruct, expected] of [
					[
						"/some/dir/",
						"/some/dir/to/somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					[
						"/dir/",
						"/dir/to/somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					[
						"/",
						"/dir/to/somewhere|some/other/dir!../more/dir",
						"./dir/to/somewhere|some/other/dir!../more/dir"
					],
					[
						"c:\\some\\dir\\",
						"c:\\some\\dir\\to\\somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					[
						"c:\\some\\dir\\",
						"C:\\some\\dir\\to\\somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					[
						"C:\\some\\dir",
						"C:\\some\\dir\\to\\somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					[
						"C:\\\\some\\dir",
						"c:\\some\\\\dir\\to\\\\somewhere|some/other/dir!../more/dir",
						"./to/somewhere|some/other/dir!../more/dir"
					],
					["/dir", "/dir/to/somewhere??ref-123", "./to/somewhere??ref-123"]
				]) {
					expect(identifierUtil.makePathsRelative(context, pathConstruct)).toBe(
						expected
					);
				}
			});
		});
	});

	describe("getUndoPath", () => {
		const cases = [
			["file.js", ""],
			["file.js", "./", true],
			["dir/file.js", "../"],
			["dir/file.js", "../", true],
			["./file.js", ""],
			[".dir/file.js", "../"],
			["./dir/file.js", "../"],
			["./dir/././file.js", "../"],
			["./dir/../file.js", ""],
			["./dir/../file.js", "./", true],
			["../file.js", "d/"],
			["../file.js", "./d/", true],
			["../dir/file.js", "../d/"],
			[".././../dir/file.js", "../c/d/"],
			["./.././../dir/file.js", "../c/d/"],
			["../dir/../file.js", "d/"],
			["../dir/../file.js", "./d/", true]
		];
		for (const [filename, expected, enforceRelative] of cases) {
			it(`should handle ${filename} correctly${
				enforceRelative ? " (enforced relative path)" : ""
			}`, () => {
				for (const outputPath of [
					"/a/b/c/d",
					"C:\\a\\b\\c\\d",
					"/a/b/c/d/",
					"C:\\a\\b\\c\\d\\"
				]) {
					expect(
						identifierUtil.getUndoPath(filename, outputPath, enforceRelative)
					).toBe(expected);
				}
			});
		}
	});

	describe("parseResourceWithoutFragment", () => {
		// [input, expectedPath, expectedQuery]
		/** @type {[string, string, string][]} */
		const cases = [
			["path#hash?query", "path#hash", "?query"],
			["path?query#hash", "path", "?query#hash"],
			["\0#path\0??\0#query#hash", "#path?", "?#query#hash"],
			[
				'./loader.js?{"items":["a\0^","b\0!","c#","d"]}',
				"./loader.js",
				'?{"items":["a^","b!","c#","d"]}'
			],
			[
				"C:\\Users\\\0#\\repo\\loader.js?",
				"C:\\Users\\#\\repo\\loader.js",
				"?"
			],
			["/Users/\0#/repo/loader-\0#.js", "/Users/#/repo/loader-#.js", ""]
		];
		for (const case_ of cases) {
			it(case_[0], () => {
				const { resource, path, query } =
					identifierUtil.parseResourceWithoutFragment(case_[0]);
				expect(case_[0]).toBe(resource);
				expect(case_[1]).toBe(path);
				expect(case_[2]).toBe(query);
			});
		}
	});

	describe("parseResource", () => {
		// [input, expectedPath, expectedQuery, expectedFragment]
		/** @type {[string, string, string, string][]} */
		const cases = [
			["path", "path", "", ""],
			["path?query", "path", "?query", ""],
			["path#hash", "path", "", "#hash"],
			["path?query#hash", "path", "?query", "#hash"],
			["path#hash?query", "path", "", "#hash?query"],
			["./file.js#fragment", "./file.js", "", "#fragment"],
			["./file.js?query#fragment", "./file.js", "?query", "#fragment"],
			["\0#path\0??\0#query#hash", "#path?", "?#query", "#hash"],
			// Absolute path with `#` in a directory name (followed by path separator)
			// should be kept as part of the path, not treated as a fragment.
			// See https://github.com/webpack/webpack/issues/16819
			[
				"/home/user/f#/webpack/file.js",
				"/home/user/f#/webpack/file.js",
				"",
				""
			],
			[
				"/home/user/f#/webpack/file.js?query",
				"/home/user/f#/webpack/file.js",
				"?query",
				""
			],
			[
				"/home/user/f#/webpack/file.js#fragment",
				"/home/user/f#/webpack/file.js",
				"",
				"#fragment"
			],
			[
				"/home/user/f#/webpack/file.js?query#fragment",
				"/home/user/f#/webpack/file.js",
				"?query",
				"#fragment"
			],
			[
				"/home/user/f#/a#/file.js?query",
				"/home/user/f#/a#/file.js",
				"?query",
				""
			],
			[
				"C:\\Users\\f#\\webpack\\file.js",
				"C:\\Users\\f#\\webpack\\file.js",
				"",
				""
			],
			[
				"C:\\Users\\f#\\webpack\\file.js?query",
				"C:\\Users\\f#\\webpack\\file.js",
				"?query",
				""
			],
			[
				"C:/Users/f#/webpack/file.js?query#fragment",
				"C:/Users/f#/webpack/file.js",
				"?query",
				"#fragment"
			]
		];
		for (const case_ of cases) {
			it(case_[0], () => {
				const { resource, path, query, fragment } =
					identifierUtil.parseResource(case_[0]);
				expect(resource).toBe(case_[0]);
				expect(path).toBe(case_[1]);
				expect(query).toBe(case_[2]);
				expect(fragment).toBe(case_[3]);
			});
		}
	});
});
