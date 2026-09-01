"use strict";

const { getProtocol, getScheme } = require("../lib/util/URLAbsoluteSpecifier");

/**
 * @type {{ specifier: string, expected: string | undefined }[]}
 */
const samples = [
	{
		specifier: "@babel/core",
		expected: undefined
	},
	{
		specifier: "webpack",
		expected: undefined
	},
	{
		specifier: "1webpack:///c:/windows/dir",
		expected: undefined
	},
	{
		specifier: "webpack:///c:/windows/dir",
		expected: "webpack"
	},
	{
		specifier: "WEBPACK2020:///c:/windows/dir",
		expected: "webpack2020"
	},
	{
		specifier: "my-data:image/jpg;base64",
		expected: "my-data"
	},
	{
		specifier: "My+Data:image/jpg;base64",
		expected: "my+data"
	},
	{
		specifier: "mY+dATA:image/jpg;base64",
		expected: "my+data"
	},
	{
		specifier: "vnd.example:data",
		expected: "vnd.example"
	},
	{
		specifier: "VND.Example:data",
		expected: "vnd.example"
	},
	{
		specifier: "web+foo.bar-baz2:resource",
		expected: "web+foo.bar-baz2"
	},
	{
		// a scheme must start with a letter, so a leading dot is not one
		specifier: ".vnd:data",
		expected: undefined
	},
	{
		// trailing dot before the colon is still a valid scheme character
		specifier: "vnd.:data",
		expected: "vnd."
	},
	{
		specifier: "./relative.path:not-a-scheme",
		expected: undefined
	},
	{
		specifier: "my-data/next:image/",
		expected: undefined
	},
	{
		specifier: "my-data\\next:image/",
		expected: undefined
	},
	{
		specifier: "D:\\path\\file.js",
		expected: undefined
	},
	{
		specifier: "d:/path/file.js",
		expected: undefined
	},
	{
		specifier: "z:#foo",
		expected: undefined
	},
	{
		specifier: "Z:?query",
		expected: undefined
	},
	{
		specifier: "C:",
		expected: undefined
	}
];

describe("getScheme", () => {
	for (const [_i, { specifier, expected }] of samples.entries()) {
		it(`should handle ${specifier}`, () => {
			expect(getScheme(specifier)).toBe(expected);
		});
	}
});

describe("getProtocol", () => {
	for (const [_i, { specifier, expected }] of samples.entries()) {
		it(`should handle ${specifier}`, () => {
			expect(getProtocol(specifier)).toBe(
				expected ? `${expected}:` : undefined
			);
		});
	}
});
