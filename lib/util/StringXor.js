/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class StringXor {
	constructor() {
		this._value = undefined;
	}

	add(str) {
		const buf = Buffer.from(str);
		let value = this._value;
		if (value === undefined) {
			this._value = buf;
			return;
		}
		if (value.length < buf.length) {
			this._value = Buffer.allocUnsafe(buf.length);
			value.copy(this._value);
			this._value.fill(0, value.length);
			value = this._value;
		}
		for (let i = 0; i < buf.length; i++) {
			value[i] = value[i] ^ buf[i];
		}
	}

	toString() {
		return this._value === undefined ? "" : this._value.toString();
	}

	updateHash(hash) {
		if (this._value !== undefined) hash.update(this._value);
	}
}

module.exports = StringXor;
