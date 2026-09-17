/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

class LocConverter {
	/**
	 * Creates an instance of LocConverter.
	 * @param {string} input input
	 */
	constructor(input) {
		/** @type {string} */
		this._input = input;
		/** @type {number} */
		this.line = 1;
		/** @type {number} */
		this.column = 0;
		/** @type {number} */
		this.pos = 0;
		// Next `\n` at/after `pos` (`input.length` if none, -1 = unknown);
		// when >= pos there is no `\n` in [pos, _nextNewline).
		/** @type {number} */
		this._nextNewline = -1;
	}

	/**
	 * Returns location converter.
	 * @param {number} pos position
	 * @returns {LocConverter} location converter
	 */
	get(pos) {
		if (this.pos !== pos) {
			const input = this._input;
			if (this.pos < pos) {
				// Advance: O(1) on the same line via the cached next-newline offset,
				// otherwise hop newline-to-newline with native indexOf — each re-scan
				// is bounded by one line, amortized O(1)/byte for monotone callers.
				let next = this._nextNewline;
				if (next < this.pos) {
					next = input.indexOf("\n", this.pos);
					if (next === -1) next = input.length;
				}
				if (pos <= next) {
					this.column += pos - this.pos;
				} else {
					let line = this.line;
					let last = next;
					for (;;) {
						line++;
						next = input.indexOf("\n", last + 1);
						if (next === -1) next = input.length;
						// `next >= input.length` guards termination for out-of-range `pos`.
						if (pos <= next || next >= input.length) break;
						last = next;
					}
					this.line = line;
					this.column = pos - last - 1;
				}
				this._nextNewline = next;
			} else if (this.line === 1) {
				// Retreat on line 1: no `\n` precedes `pos`, the cache stays valid.
				this.column = pos;
			} else {
				// WHY: A `\n` counts as the last column of its own line here, so a
				// `this.pos` sitting on one is already on that line. Retreating
				// therefore crosses only the newlines at or after `pos` and strictly
				// before `this.pos` — the newline at `this.pos` is not one of them.
				let i = input.lastIndexOf("\n", this.pos - 1);
				while (i >= pos) {
					this._nextNewline = i;
					this.line--;
					i = i > 0 ? input.lastIndexOf("\n", i - 1) : -1;
				}
				this.column = i === -1 ? pos : pos - i - 1;
			}
			this.pos = pos;
		}
		return this;
	}
}

module.exports = LocConverter;
