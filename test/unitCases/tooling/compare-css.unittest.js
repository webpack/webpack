"use strict";

const CACHE_NAME = "css-tool-comparison";

const installed = jest.fn(() => Promise.resolve(CACHE_NAME));

// A real install would `npm ci` the corpus into a contributor's cache, and every
// packed stylesheet and built fixture is taken as there, so `--setup` fetches
// and builds nothing: what is under test is that it installs and stops.
// css-tree is installed into that same cache, so its tree is written out by
// hand; postcss arrives with the `css-loader` dev dependency, so it is real.
const mockCssTree = { parse: jest.fn() };

jest.mock("../../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../../tooling/compare-tools-harness"),
	exists: () => Promise.resolve(true),
	installPackages: installed,
	loaderFor: () => (/** @type {string} */ name) =>
		name === "css-tree" ? mockCssTree : require(name)
}));

const { SourceProcessor } = require("../../../lib/css/syntax");
const {
	COLD_BRANCHES,
	TREE_READERS,
	runMode
} = require("../../../tooling/compare-css-tools");
const { agreement } = require("../../../tooling/compare-tools-harness");

// Read before anything clears the mock: an unguarded script installs while
// being required, and a `beforeEach` would erase exactly that evidence.
const callsWhileRequiring = installed.mock.calls.length;

describe("the CSS tool comparison", () => {
	it("should start nothing when the script is required rather than run", () => {
		expect(callsWhileRequiring).toBe(0);
	});

	it("should install the corpus and stop on `--setup`", async () => {
		installed.mockClear();

		await runMode("--setup");

		expect(installed).toHaveBeenCalledTimes(1);
		expect(installed).toHaveBeenCalledWith(CACHE_NAME);
	});
});

// What each rewrite the fixture is there for writes. Every one was counted at
// zero over every stylesheet on disk before the fixture was written, so an edit
// dropping one would take a branch out of reach with it.
const REDUCED = [
	["matrix to a scale", "matrix(2,0,0,3,0,0)", "scale(2,3)"],
	["matrix to a translate", "matrix(1,0,0,1,10,20)", "translate(10px,20px)"],
	["matrix to a quarter turn", "matrix(0,1,-1,0,0,0)", "rotate(90deg)"],
	["matrix to three quarters", "matrix(0,-1,1,0,0,0)", "rotate(270deg)"],
	[
		"matrix3d to a 2D matrix",
		"matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,20,0,1)",
		"translate(10px,20px)"
	],
	[
		"matrix3d to a translate3d",
		"matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,20,30,1)",
		"translate3d(10px,20px,30px)"
	],
	[
		"matrix3d to a scale3d",
		"matrix3d(2,0,0,0,0,3,0,0,0,0,4,0,0,0,0,1)",
		"scale3d(2,3,4)"
	],
	["scale3d to a scaleZ", "scale3d(1,1,2)", "scaleZ(2)"]
];

// The value each rewrite must decline, which is what says the guard is read
// rather than the branch alone.
const KEPT = [
	["a matrix of no named shape", "matrix(1,2,3,4,5,6)"],
	[
		"a matrix3d that is a shear",
		"matrix3d(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)"
	],
	["a rotation about no axis", "rotate3d(1,1,0,45deg)"]
];

/**
 * @param {string} css a stylesheet
 * @param {import("../../../lib/css/syntax-parser").CssPrintOptions} options print options
 * @returns {string} it, minified
 */
const minify = (css, options) =>
	new SourceProcessor().process(css, { mode: "minify", ...options }).code;

describe("compare-css-tools — the cold branches fixture", () => {
	it.each(REDUCED)("carries %s", (_name, written) => {
		expect(COLD_BRANCHES).toContain(written);
	});

	it.each(KEPT)("carries %s", (_name, written) => {
		expect(COLD_BRANCHES).toContain(written);
	});

	it.each(REDUCED)("writes %s as the shorter call", (_name, written, into) => {
		expect(minify(`a{transform:${written}}`, {})).toBe(`a{transform:${into}}`);
	});

	it.each(KEPT)("keeps %s", (_name, written) => {
		expect(minify(`a{transform:${written}}`, {})).toBe(
			`a{transform:${written}}`
		);
	});

	it.each([
		["rgb", "rgb(from #808080 r g b)"],
		["rgba", "rgba(from #808080 r g b / 0.5)"],
		["hsl", "hsl(from #808080 h s l)"],
		["hsla", "hsla(from #808080 h s l / 0.5)"],
		["hwb", "hwb(from #808080 h w b)"],
		["lab", "lab(from #808080 l a b)"],
		["lch", "lch(from #808080 l c h)"],
		["oklab", "oklab(from #808080 l a b)"],
		["oklch", "oklch(from #808080 l c h)"],
		["color", "color(from #808080 srgb r g b)"]
	])("carries a relative reference through %s", (_name, written) => {
		expect(COLD_BRANCHES).toContain(written);
	});

	it("carries what the fixture reaches beyond the reducers", () => {
		// An escaped paren inside an unquoted `url()`, and the column combinator —
		// neither is written by any stylesheet the sweep installs.
		expect(COLD_BRANCHES).toContain("url(a\\(b\\).png)");
		expect(COLD_BRANCHES).toContain(" || ");
		// A reference the fold cannot pin down, so the printer keeps the call.
		expect(COLD_BRANCHES).toContain("rgb(from currentcolor r g b)");
	});

	it("is its own output under every preset it is swept with", () => {
		for (const options of [
			{},
			{ environment: { browsers: ["chrome 100", "firefox 100", "safari 15.4"] } }
		]) {
			const once = minify(COLD_BRANCHES, options);
			expect(minify(once, options)).toBe(once);
		}
	});
});

describe("compare-css-tools — agreeing with css-tree", () => {
	const css =
		'/* c */ .a /* s */ .d { color : red /* v */ !important; .b{x:y;z:} } @media (x)/* m */,(y){.c{d:e}} @font-face{} @import "x";';

	/**
	 * @param {string} text a part of the stylesheet
	 * @param {string=} before what it follows, where the text alone isn't unique
	 * @returns {{ loc: { start: { offset: number }, end: { offset: number } } }} where it is
	 */
	const at = (text, before = "") => {
		const offset = css.indexOf(before + text) + before.length;
		return { loc: { start: { offset }, end: { offset: offset + text.length } } };
	};

	/**
	 * @param {string} prelude a rule's prelude
	 * @param {EXPECTED_ANY[]} children what its block holds
	 * @returns {EXPECTED_ANY} a css-tree rule
	 */
	const rule = (prelude, children) => ({
		type: "Rule",
		prelude: at(prelude),
		block: { children }
	});

	/**
	 * What css-tree builds for the stylesheet, where it read `.b{x:y}`.
	 * @param {EXPECTED_ANY} nested the node standing for `.b{x:y}`
	 * @returns {EXPECTED_ANY} the css-tree stylesheet
	 */
	const parsed = (nested) => ({
		children: [
			rule(".a /* s */ .d", [
				{
					type: "Declaration",
					property: "color",
					important: true,
					value: at("red /* v */")
				},
				nested
			]),
			{
				type: "Atrule",
				name: "media",
				prelude: at("(x)/* m */,(y)"),
				block: {
					children: [
						rule(".c", [
							{
								type: "Declaration",
								property: "d",
								important: false,
								value: at("e", "d:")
							}
						])
					]
				}
			},
			{
				type: "Atrule",
				name: "font-face",
				prelude: null,
				block: { children: [] }
			},
			{ type: "Atrule", name: "import", prelude: at('"x"'), block: null }
		]
	});

	const nestedRule = rule(".b", [
		{ type: "Declaration", property: "x", important: false, value: at("y") },
		{ type: "Declaration", property: "z", important: false, value: at("", "z:") }
	]);

	it("holds webpack and postcss to css-tree's rules, at-rules and declarations", async () => {
		mockCssTree.parse.mockReturnValue(parsed(nestedRule));
		const cell = agreement("css-tree", TREE_READERS, css);
		expect(await cell("css-tree")).toBe("reference");
		expect(await cell("stylis")).toBe("own dialect");
		expect(await cell("webpack")).toBe("yes");
		expect(await cell("postcss")).toBe("yes");
	});

	it("names a block css-tree left unparsed", async () => {
		mockCssTree.parse.mockReturnValue(
			parsed({ type: "Raw", ...at(".b{x:y;z:}") })
		);
		expect(await agreement("css-tree", TREE_READERS, css)("webpack")).toBe(
			"no — /.a .d[1]: css-tree unparsed .b{x:y;z:}, tool rule .b"
		);
	});
});
