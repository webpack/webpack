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
		this._input = input;
		this.line = 1;
		this.column = 0;
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
				const str = this._input.slice(this.pos, pos);
				let i = str.lastIndexOf("\n");
				if (i === -1) {
					this.column += str.length;
				} else {
					this.column = str.length - i - 1;
					this.line++;
					while (i > 0 && (i = str.lastIndexOf("\n", i - 1)) !== -1) {
						this.line++;
					}
				}
			} else {
				let i = this._input.lastIndexOf("\n", this.pos);
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
