const { getScheme, getProtocol } = require("../lib/util/URLAbsoluteSpecifier");

/**
 * @type {Array<{specifier: string, expected: string|undefined}>}
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
	samples.forEach(({ specifier, expected }, i) => {
		it(`should handle ${specifier}`, () => {
			expect(getScheme(specifier)).toBe(expected);
		});
	});
});

describe("getProtocol", () => {
	samples.forEach(({ specifier, expected }, i) => {
		it(`should handle ${specifier}`, () => {
			expect(getProtocol(specifier)).toBe(
				expected ? expected + ":" : undefined
			);
		});
	});
});
