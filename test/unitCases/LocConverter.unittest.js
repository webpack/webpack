"use strict";

// cspell:ignore ncde nfghi

const LocConverter = require("../../lib/util/LocConverter");

describe("LocConverter", () => {
	/**
	 * @param {LocConverter} converter converter
	 * @param {number} pos position
	 * @returns {[number, number]} line and column at `pos`
	 */
	const at = (converter, pos) => {
		const c = converter.get(pos);
		return [c.line, c.column];
	};

	it("tracks a mixed forward / backward query sequence", () => {
		// offsets: a=0 b=1 \n=2 c=3 d=4 e=5 \n=6 \n=7 f=8 g=9 h=10 i=11 \n=12
		const converter = new LocConverter("ab\ncde\n\nfghi\n", "html");
		// same-line advances (a `\n` is the last column of its line)
		expect(at(converter, 1)).toEqual([1, 1]);
		expect(at(converter, 2)).toEqual([1, 2]);
		// crossing advance onto the next line
		expect(at(converter, 3)).toEqual([2, 0]);
		// cached same-line advance
		expect(at(converter, 5)).toEqual([2, 2]);
		// multi-newline crossing hop (empty line in between)
		expect(at(converter, 11)).toEqual([4, 3]);
		// pos === input.length just past the trailing newline
		expect(at(converter, 13)).toEqual([5, 0]);
		// retreat crossing one newline
		expect(at(converter, 8)).toEqual([4, 0]);
		// retreat crossing several newlines back to the start
		expect(at(converter, 0)).toEqual([1, 0]);
		// advance again — the retreat must have left a valid newline cache
		expect(at(converter, 4)).toEqual([2, 1]);
		// retreat within the same line (no newline crossed)
		expect(at(converter, 3)).toEqual([2, 0]);
	});

	it("stays on line 1 for newline-free input", () => {
		const converter = new LocConverter("abcdef", "html");
		expect(at(converter, 3)).toEqual([1, 3]);
		// pos === input.length with no newline anywhere
		expect(at(converter, 6)).toEqual([1, 6]);
		// line-1 retreat fast path
		expect(at(converter, 1)).toEqual([1, 1]);
	});

	it("handles input consisting only of newlines", () => {
		const converter = new LocConverter("\n\n\n", "html");
		expect(at(converter, 1)).toEqual([2, 0]);
		expect(at(converter, 3)).toEqual([4, 0]);
		expect(at(converter, 0)).toEqual([1, 0]);
	});

	it("stops at line 1 for an offset before the input, read after a later line", () => {
		const converter = new LocConverter("a\nb\nc", "javascript");
		expect(at(converter, 4)).toEqual([3, 0]);
		expect(at(converter, -1)).toEqual([1, -1]);
		expect(at(converter, 2)).toEqual([2, 0]);
	});

	it("handles empty input", () => {
		const converter = new LocConverter("", "html");
		expect(at(converter, 0)).toEqual([1, 0]);
	});

	it("ends a line at a lone carriage return, and at CRLF once", () => {
		// offsets: a=0 \r=1 b=2 \r=3 \n=4 c=5
		const converter = new LocConverter("a\rb\r\nc", "html");
		expect(at(converter, 1)).toEqual([1, 1]);
		expect(at(converter, 2)).toEqual([2, 0]);
		expect(at(converter, 4)).toEqual([2, 2]);
		expect(at(converter, 5)).toEqual([3, 0]);
		expect(at(converter, 0)).toEqual([1, 0]);
	});

	it("ends a line at each language's own terminators", () => {
		// offsets: a=0 then the separator at 1, b=2
		/** @type {[string, import("../../lib/util/LocConverter").LineTerminators, number][]} */
		const cases = [
			["\f", "css", 2],
			["\f", "html", 1],
			["\f", "javascript", 1],
			["\u2028", "javascript", 2],
			["\u2029", "javascript", 2],
			["\u2028", "css", 1],
			["\u2029", "html", 1],
			["\r", "javascript", 2]
		];
		for (const [separator, language, line] of cases) {
			expect(at(new LocConverter(`a${separator}b`, language), 2)).toEqual([
				line,
				line === 2 ? 0 : 2
			]);
		}
	});
});
