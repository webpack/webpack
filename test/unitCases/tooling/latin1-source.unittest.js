"use strict";

const { toLatin1Source } = require("../../../tooling/latin1-source");

describe("latin1-source", () => {
	/**
	 * @param {string} source a script evaluating to a string, a list of numbers or nothing
	 * @returns {string | number[] | undefined} what it evaluates to
	 */
	const run = (source) =>
		/** @type {string | number[] | undefined} */ (
			// eslint-disable-next-line no-new-func
			new Function(`return (${source});`)()
		);

	it("escapes a string's character and spells a comment's in ASCII", () => {
		const source = '/* a — b */ "x\u2192y"';
		const rewritten = toLatin1Source(source);
		expect(rewritten).toBe('/* a - b */ "x\\u2192y"');
		expect(run(rewritten)).toBe(run(source));
	});

	it("writes whitespace between tokens as a space and a line separator as a newline", () => {
		const source = "[1,  2,  3]";
		const rewritten = toLatin1Source(source);
		expect(rewritten).toBe("[1,  2,\n 3]");
		expect(run(rewritten)).toEqual(run(source));
	});

	it("keeps a line separator in a block comment a line break, as ASI reads it", () => {
		const source = "(function () { return/*\u2028*/1; })()";
		const rewritten = toLatin1Source(source);
		expect(rewritten).toBe("(function () { return/*\n*/1; })()");
		expect(run(rewritten)).toBe(run(source));
		expect(run(source)).toBeUndefined();
	});

	it("escapes an astral character of a name by its code point", () => {
		const source = "(() => { const \ud835\udc9c = 1; return \ud835\udc9c + \"\ud835\udc9c\"; })()";
		const rewritten = toLatin1Source(source);
		expect(rewritten).toBe(
			'(() => { const \\u{1D49C} = 1; return \\u{1D49C} + "\\uD835\\uDC9C"; })()'
		);
		expect(run(rewritten)).toBe(run(source));
	});

	it("refuses a JSDoc type, which reads its text as the code it types does", () => {
		expect(() =>
			toLatin1Source('/** @type {"\u2192"} */ const value = "\u2192";')
		).toThrow(/JSDoc type/);
		expect(toLatin1Source("/** a \u2192 b */ 1")).toBe("/** a -> b */ 1");
		expect(toLatin1Source("/** Example: {a \u2192 b} */ 1")).toBe(
			"/** Example: {a -> b} */ 1"
		);
	});

	it("refuses a tagged template's text, which its tag reads as written", () => {
		expect(() => toLatin1Source("String.raw`a\u2192b`")).toThrow(
			/tagged template/
		);
		expect(() =>
			toLatin1Source(
				"class C { #tag = String.raw; value() { return this.#tag`\u2192`; } }"
			)
		).toThrow(/tagged template/);
	});
});
