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

	describe("escapeHashInAbsolutePath", () => {
		// [input, expected]
		/** @type {[string, string][]} */
		const cases = [
			["", ""],
			["./relative/file.js", "./relative/file.js"],
			["./relative/with#hash/file.js", "./relative/with#hash/file.js"],
			["module-name", "module-name"],
			["/abs/path/file.js", "/abs/path/file.js"],
			["/abs/path/file.js#fragment", "/abs/path/file.js#fragment"],
			["/abs/path/file.js?query", "/abs/path/file.js?query"],
			["/abs/path/file.js?query#frag", "/abs/path/file.js?query#frag"],
			["/home/user/proj#1/file.js", "/home/user/proj\0#1/file.js"],
			["/home/user/proj#1/file.js?q=1", "/home/user/proj\0#1/file.js?q=1"],
			[
				"/home/user/proj#1/file.js#fragment",
				"/home/user/proj\0#1/file.js#fragment"
			],
			["/home/user/a#b/c#d/file.js?q=1", "/home/user/a\0#b/c\0#d/file.js?q=1"],
			["C:\\Users\\proj#1\\file.js?q=1", "C:\\Users\\proj\0#1\\file.js?q=1"],
			["C:/Users/proj#1/file.js", "C:/Users/proj\0#1/file.js"],
			// the exact request webpack-dev-server produces for issue #16819
			[
				"/home/felix/projects/f#/webpack/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8080",
				"/home/felix/projects/f\0#/webpack/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8080"
			]
		];
		for (const [input, expected] of cases) {
			it(JSON.stringify(input), () => {
				expect(identifierUtil.escapeHashInAbsolutePath(input)).toBe(expected);
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
