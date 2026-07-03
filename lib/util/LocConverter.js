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
				// Advance: delta-bounded scan of [this.pos, pos), allocation-free
				// (unbounded index scans go quadratic on newline-free input).
				const input = this._input;
				let last = -1;
				for (let j = this.pos; j < pos; j++) {
					if (input.charCodeAt(j) === 10) {
						this.line++;
						last = j;
					}
				}
				this.column =
					last === -1 ? this.column + (pos - this.pos) : pos - last - 1;
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
