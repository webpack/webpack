/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class StringXor {
	constructor() {
		this._value = undefined;
		this._buffer = undefined;
	}

	add(str) {
		let buf = this._buffer;
		let value;
		if (buf === undefined) {
			buf = this._buffer = Buffer.from(str, "latin1");
			this._value = Buffer.from(buf);
			return;
		} else if (buf.length !== str.length) {
			value = this._value;
			buf = this._buffer = Buffer.from(str, "latin1");
			if (value.length < buf.length) {
				this._value = Buffer.allocUnsafe(buf.length);
				value.copy(this._value);
				this._value.fill(0, value.length);
				value = this._value;
			}
		} else {
			value = this._value;
			buf.write(str, "latin1");
		}
		const len = buf.length;
		for (let i = 0; i < len; i++) {
			value[i] = value[i] ^ buf[i];
		}
	}

	toString() {
		return this._value === undefined ? "" : this._value.toString("latin1");
	}

	updateHash(hash) {
		if (this._value !== undefined) hash.update(this._value);
	}
}

module.exports = StringXor;
