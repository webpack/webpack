"use strict";

const identifierUtil = require("../lib/util/identifier");

describe("util/identifier", () => {
	describe("makePathsRelative", () => {
		describe("given a context and a pathConstruct", () => {
			it("computes the correct relative results for the path construct", () => {
				[
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
				].forEach(([context, pathConstruct, expected]) => {
					expect(identifierUtil.makePathsRelative(context, pathConstruct)).toBe(
						expected
					);
				});
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
});
