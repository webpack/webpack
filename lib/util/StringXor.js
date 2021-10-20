/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class StringXor {
	constructor() {
		this._value = undefined;
	}

	/**
	 * @param {string} str string
	 * @returns {void}
	 */
	add(str) {
		const len = str.length;
		const value = this._value;
		if (value === undefined) {
			const newValue = (this._value = Buffer.allocUnsafe(len));
			for (let i = 0; i < len; i++) {
				newValue[i] = str.charCodeAt(i);
			}
			return;
		}
		const valueLen = value.length;
		if (valueLen < len) {
			const newValue = (this._value = Buffer.allocUnsafe(len));
			let i;
			for (i = 0; i < valueLen; i++) {
				newValue[i] = value[i] ^ str.charCodeAt(i);
			}
			for (; i < len; i++) {
				newValue[i] = str.charCodeAt(i);
			}
		} else {
			for (let i = 0; i < len; i++) {
				value[i] = value[i] ^ str.charCodeAt(i);
			}
		}
	}

	toString() {
		const value = this._value;
		return value === undefined ? "" : value.toString("latin1");
	}

	updateHash(hash) {
		const value = this._value;
		if (value !== undefined) hash.update(value);
	}
}

module.exports = StringXor;
