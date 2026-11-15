/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @typedef {"css" | "html" | "javascript"} LineTerminators */

// WHY: each spec's line terminators besides LF, CRLF counting once in all three:
// CSS Syntax §3.3 adds FF, HTML's "normalize newlines" (and XML 1.0 §2.11) a lone
// CR only, ECMAScript §12.3 LineTerminatorSequence <LS> and <PS> too.
const OTHER_TERMINATORS = {
	css: /\r(?!\n)|\f/g,
	html: /\r(?!\n)/g,
	javascript: /\r(?!\n)|[\u2028\u2029]/g
};

/**
 * Replaces every other line terminator with `\n`, keeping each offset in place.
 * @param {string} input input
 * @param {LineTerminators} lineTerminators the language whose line terminators apply
 * @returns {string} the input whose only line terminator is `\n` (CRLF counted once)
 */
const toNewlines = (input, lineTerminators) => {
	if (
		input.includes("\r") ||
		(lineTerminators === "css"
			? input.includes("\f")
			: lineTerminators === "javascript" &&
				(input.includes("\u2028") || input.includes("\u2029")))
	) {
		return input.replace(OTHER_TERMINATORS[lineTerminators], "\n");
	}
	return input;
};

class LocConverter {
	/**
	 * Creates an instance of LocConverter, counting lines by the language's spec.
	 * @param {string} input input
	 * @param {LineTerminators} lineTerminators the language whose line terminators apply
	 */
	constructor(input, lineTerminators) {
		/** @type {string} */
		this._input = toNewlines(input, lineTerminators);
		/** @type {number} */
		this.line = 1;
		/** @type {number} */
		this.column = 0;
		/** @type {number} */
		this.pos = 0;
		/** @type {number[] | undefined} every `\n`, in order, found on the first lookup off the start line */
		this._newlines = undefined;
		/** @type {number} where the current line starts */
		this._lineStart = 0;
		/** @type {number} the `\n` ending the current line, `-1` while unknown */
		this._lineEnd = -1;
	}

	/**
	 * Sets `line` and `column` to those of a position: a `\n` is the last column
	 * of its own line. The `\n`s are found once, a lookup is a binary search.
	 * @param {number} pos position
	 * @returns {LocConverter} location converter
	 */
	get(pos) {
		if (this.pos === pos) return this;
		if (pos >= this._lineStart && pos <= this._lineEnd) {
			// most calls stay on the line the last one was on
			this.column = pos - this._lineStart;
			this.pos = pos;
			return this;
		}
		let newlines = this._newlines;
		if (newlines === undefined) {
			// one pass over the whole input: the lookups of a module reach its end
			newlines = this._newlines = [];
			const input = this._input;
			let next = input.indexOf("\n");
			while (next !== -1) {
				newlines.push(next);
				next = input.indexOf("\n", next + 1);
			}
		}
		// how many of them lie before `pos`
		let low = 0;
		let high = newlines.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (newlines[middle] < pos) low = middle + 1;
			else high = middle;
		}
		this.line = low + 1;
		this.column = low === 0 ? pos : pos - newlines[low - 1] - 1;
		this.pos = pos;
		// a position before the input is on no line the next call can reuse
		this._lineStart = pos < 0 ? 0 : low === 0 ? 0 : newlines[low - 1] + 1;
		this._lineEnd = pos >= 0 && low < newlines.length ? newlines[low] : -1;
		return this;
	}
}

module.exports = LocConverter;
