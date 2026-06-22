"use strict";

const path = require("path");
const identifierUtil = require("../lib/util/identifier");

describe("util/identifier", () => {
	describe("ABSOLUTE_PATH_REGEXP", () => {
		const { ABSOLUTE_PATH_REGEXP } = identifierUtil;

		it("matches POSIX and every Windows absolute path type", () => {
			for (const absolute of [
				"/dir/file",
				"/",
				"C:\\dir\\file",
				"c:/dir/file",
				"C:\\",
				"\\\\server\\share\\file",
				"//server/share",
				"\\dir\\file",
				"\\\\?\\C:\\dir",
				"\\\\.\\C:\\dir"
			]) {
				expect(ABSOLUTE_PATH_REGEXP.test(absolute)).toBe(true);
			}
		});

		it("does not match relative or drive-relative paths", () => {
			for (const relative of [
				"dir\\file",
				"./dir",
				"../dir",
				"C:dir",
				"C:",
				""
			]) {
				expect(ABSOLUTE_PATH_REGEXP.test(relative)).toBe(false);
			}
		});

		it("agrees with path.win32.isAbsolute and path.posix.isAbsolute", () => {
			for (const p of [
				"C:\\dir",
				"c:/dir",
				"C:dir",
				"\\\\server\\share",
				"\\dir",
				"/dir",
				"dir/file",
				"./dir",
				"..",
				""
			]) {
				expect(ABSOLUTE_PATH_REGEXP.test(p)).toBe(
					path.win32.isAbsolute(p) || path.posix.isAbsolute(p)
				);
			}
		});
	});

	describe("WINDOWS_ABS_PATH_REGEXP", () => {
		const { WINDOWS_ABS_PATH_REGEXP } = identifierUtil;

		it("matches only Windows drive-letter absolute paths", () => {
			for (const drive of ["C:\\dir\\file", "c:/dir/file", "C:\\"]) {
				expect(WINDOWS_ABS_PATH_REGEXP.test(drive)).toBe(true);
			}
			// a leading "/" is NOT a drive path: it stays relative to a base (#12759)
			for (const other of [
				"/dir/file",
				"/",
				"\\dir",
				"\\\\server\\share",
				"x"
			]) {
				expect(WINDOWS_ABS_PATH_REGEXP.test(other)).toBe(false);
			}
		});
	});

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
		/** @type {[string, string, boolean?][]} */
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
						identifierUtil.getUndoPath(
							filename,
							outputPath,
							/** @type {boolean} */ (enforceRelative)
						)
					).toBe(expected);
				}
			});
		}
	});

	describe("escapeHashInPathRequest", () => {
		// [input, expected]
		/** @type {[string, string][]} */
		const cases = [
			["", ""],
			// without a query, the resolver handles directory `#` itself, so
			// nothing is escaped
			["/home/user/proj#1/file.js", "/home/user/proj#1/file.js"],
			["./proj#1/file.js", "./proj#1/file.js"],
			[
				"./resourceFragment/index#/some/fragment",
				"./resourceFragment/index#/some/fragment"
			],
			["/abs/path/file.js#fragment", "/abs/path/file.js#fragment"],
			// bare module specifiers are not touched
			["module-name?q=1", "module-name?q=1"],
			["module-name#fragment?q=1", "module-name#fragment?q=1"],
			["@scope/pkg#frag?q=1", "@scope/pkg#frag?q=1"],
			// path + query without `#` → unchanged
			["/abs/path/file.js?query", "/abs/path/file.js?query"],
			["./rel/file.js?query", "./rel/file.js?query"],
			// `#` after query is a real fragment, not escaped
			["/abs/path/file.js?query#frag", "/abs/path/file.js?query#frag"],
			// `#` after last path separator (before query) is a fragment, not escaped
			["/abs/path/file.js#frag?q=1", "/abs/path/file.js#frag?q=1"],
			["./rel/file.js#frag?q=1", "./rel/file.js#frag?q=1"],
			// `#` in directory portion with query → escaped
			["/home/user/proj#1/file.js?q=1", "/home/user/proj\0#1/file.js?q=1"],
			["/home/user/a#b/c#d/file.js?q=1", "/home/user/a\0#b/c\0#d/file.js?q=1"],
			["C:\\Users\\proj#1\\file.js?q=1", "C:\\Users\\proj\0#1\\file.js?q=1"],
			["C:/Users/proj#1/file.js?q=1", "C:/Users/proj\0#1/file.js?q=1"],
			["./rel/with#hash/file.js?q=1", "./rel/with\0#hash/file.js?q=1"],
			["../parent#dir/file.js?q=1", "../parent\0#dir/file.js?q=1"],
			["./a#b/c#d/file.js?q=1", "./a\0#b/c\0#d/file.js?q=1"],
			[".\\rel#dir\\file.js?q=1", ".\\rel\0#dir\\file.js?q=1"],
			// the exact request webpack-dev-server produces for issue #16819
			[
				"/home/felix/projects/f#/webpack/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8080",
				"/home/felix/projects/f\0#/webpack/node_modules/webpack-dev-server/client/index.js?protocol=ws%3A&hostname=0.0.0.0&port=8080"
			],
			// pre-escaped `\0#` is preserved (explicit opt-out remains stable)
			["/home/user/proj\0#1/file.js?q=1", "/home/user/proj\0#1/file.js?q=1"],
			[
				"/home/user/proj\0#a/raw#b/file.js?q=1",
				"/home/user/proj\0#a/raw\0#b/file.js?q=1"
			],
			["./proj\0#1/file.js?q=1", "./proj\0#1/file.js?q=1"]
		];
		for (const [input, expected] of cases) {
			it(JSON.stringify(input), () => {
				expect(identifierUtil.escapeHashInPathRequest(input)).toBe(expected);
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
