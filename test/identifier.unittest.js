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

	describe("makePathsAbsolute", () => {
		describe("should not absolutify regex patterns", () => {
			it("should not absolutify regex patterns in context module identifiers", () => {
				// Issue #16259: Context module identifiers with regex patterns
				// containing ./ should not have regex patterns made absolute
				const context = "/project";
				const identifier = "./src|sync|^\\.\\/.*\\.js$";
				const result = identifierUtil.makePathsAbsolute(context, identifier);
				// Only ./src should be made absolute, regex pattern should remain unchanged
				expect(result).toMatch(
					/[/\\]project[/\\]src\|sync\|\^\\\.\\\/\.\*\\\.js\$$/
				);
			});

			it("should absolutify loader chains separated by !", () => {
				const context = "/project";
				const identifier = "./loader!./file.js";
				const result = identifierUtil.makePathsAbsolute(context, identifier);
				expect(result).toMatch(
					/[/\\]project[/\\]loader![/\\]project[/\\]file\.js$/
				);
			});

			it("should absolutify paths after pipe separators when not regex", () => {
				const context = "/project";
				const identifier = "css/auto|./bar.css";
				const result = identifierUtil.makePathsAbsolute(context, identifier);
				// ./bar.css should be made absolute since it's not a regex pattern
				expect(result).toMatch(/css\/auto\|[/\\]project[/\\]bar\.css$/);
			});

			it("should handle identifiers without separators", () => {
				const context = "/project";
				const identifier = "./src/file.js";
				const result = identifierUtil.makePathsAbsolute(context, identifier);
				expect(result).toMatch(/[/\\]project[/\\]src[/\\]file\.js$/);
			});

			it("should not modify regex patterns with metacharacters", () => {
				const context = "/project";
				const identifier = "module-name|sync|^\\.\\/.*$";
				const result = identifierUtil.makePathsAbsolute(context, identifier);
				expect(result).toBe("module-name|sync|^\\.\\/.*$");
			});
		});
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
