"use strict";

const { toLatin1Source } = require("../../../tooling/latin1-source");

describe("latin1-source", () => {
	/**
	 * @param {string} source a script
	 * @returns {unknown} what it evaluates to
	 */
	const run = (source) =>
		// eslint-disable-next-line no-new-func
		new Function(`return (${source});`)();

	it("escapes a string's character and spells a comment's in ASCII", () => {
		const source = '/* a — b */ "x→y"';
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

	it("refuses a tagged template's text, which its tag reads as written", () => {
		expect(() => toLatin1Source("String.raw`a→b`")).toThrow(
			/tagged template/
		);
	});
});
