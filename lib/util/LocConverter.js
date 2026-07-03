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
	}

	/**
	 * Returns location converter.
	 * @param {number} pos position
	 * @returns {LocConverter} location converter
	 */
	get(pos) {
		if (this.pos !== pos) {
			if (this.pos < pos) {
				// Advance: scan the input in place — no substring allocation on
				// this hot path (called per emitted location).
				const input = this._input;
				let i = input.indexOf("\n", this.pos);
				if (i === -1 || i >= pos) {
					this.column += pos - this.pos;
				} else {
					// The `do` body always assigns before the first read.
					let last;
					do {
						this.line++;
						last = i;
						i = input.indexOf("\n", i + 1);
					} while (i !== -1 && i < pos);
					this.column = pos - last - 1;
				}
			} else {
				// Retreat: count newlines crossed in (pos, this.pos), i.e.
				// exclude the newline at `this.pos` itself. By convention a
				// `\n` is the last column of its line, so when `this.pos`
				// sits on one we're already on the line containing it; only
				// newlines strictly **before** `this.pos` and at-or-after
				// `pos` represent crossed line boundaries.
				let i = this._input.lastIndexOf("\n", this.pos - 1);
				while (i >= pos) {
					this.line--;
					i = i > 0 ? this._input.lastIndexOf("\n", i - 1) : -1;
				}
				this.column = i === -1 ? pos : pos - i - 1;
			}
			this.pos = pos;
		}
		return this;
	}
}

module.exports = LocConverter;
