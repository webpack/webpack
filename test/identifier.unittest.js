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

	describe("parseResource", () => {
		// [input, expectedPath, expectedQuery, expectedFragment]
		/** @type {[string, string, string, string][]} */
		const cases = [
			["path#hash?query", "path", "", "#hash?query"],
			["path?query#hash", "path", "?query", "#hash"],
			["path", "path", "", ""],
			["path#fragment", "path", "", "#fragment"],
			["path?query", "path", "?query", ""],
			[
				"/home/user/test#folder/file.js",
				"/home/user/test#folder/file.js",
				"",
				""
			],
			[
				"C:\\Users\\test#folder\\file.js",
				"C:\\Users\\test#folder\\file.js",
				"",
				""
			],
			["C:/Users/test#folder/file.js", "C:/Users/test#folder/file.js", "", ""],
			[
				"/home/user/test#folder/file.js?protocol=ws&port=8080",
				"/home/user/test#folder/file.js",
				"?protocol=ws&port=8080",
				""
			],
			[
				"/home/user/test#folder/file.js?query=1#fragment",
				"/home/user/test#folder/file.js",
				"?query=1",
				"#fragment"
			],
			[
				"/home/user/test#a/test#b/file.js",
				"/home/user/test#a/test#b/file.js",
				"",
				""
			],
			[
				"/home/user/test#a/test#b/file.js#fragment",
				"/home/user/test#a/test#b/file.js",
				"",
				"#fragment"
			],
			["/abs/path/file.js#fragment", "/abs/path/file.js", "", "#fragment"],
			[
				"C:\\abs\\path\\file.js#fragment",
				"C:\\abs\\path\\file.js",
				"",
				"#fragment"
			],
			["./relative/file#fragment", "./relative/file", "", "#fragment"],
			["module#fragment", "module", "", "#fragment"],
			// https://github.com/webpack/webpack/issues/16819 — webpack-dev-server
			// adds entries as absolute paths with query strings when serving from a
			// project directory containing `#` (e.g. `~/projects/f#/webpack`).
			[
				"/home/felix/projects/f#/webpack/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8080&pathname=%2Fws&logging=info&overlay=true&reconnect=10&hot=true&live-reload=true",
				"/home/felix/projects/f#/webpack/node_modules/webpack-dev-server/client/index.js",
				"?protocol=ws%3A&hostname=0.0.0.0&port=8080&pathname=%2Fws&logging=info&overlay=true&reconnect=10&hot=true&live-reload=true",
				""
			]
		];
		for (const [input, path, query, fragment] of cases) {
			it(JSON.stringify(input), () => {
				const result = identifierUtil.parseResource(input);
				expect(result.path).toBe(path);
				expect(result.query).toBe(query);
				expect(result.fragment).toBe(fragment);
				expect(result.resource).toBe(input);
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
});
