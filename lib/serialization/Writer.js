/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class Writer {
	/**
	 * @param {number=} initialSize initial size
	 */
	constructor(initialSize = 16384) {
		this._buf = Buffer.allocUnsafe(initialSize);
		this._pos = 0;
	}

	/**
	 * @param {number} n needed bytes
	 * @returns {void}
	 */
	_ensure(n) {
		const need = this._pos + n;
		if (need <= this._buf.length) return;
		let size = this._buf.length * 2;
		while (size < need) size *= 2;
		const next = Buffer.allocUnsafe(size);
		this._buf.copy(next, 0, 0, this._pos);
		this._buf = next;
	}

	/**
	 * @param {number} byte byte
	 * @returns {void}
	 */
	writeU8(byte) {
		this._ensure(1);
		this._buf[this._pos++] = byte;
	}

	/**
	 * @param {number} value value
	 * @returns {void}
	 */
	writeU32(value) {
		this._ensure(4);
		this._buf.writeUInt32LE(value >>> 0, this._pos);
		this._pos += 4;
	}

	/**
	 * @param {number} value value
	 * @returns {void}
	 */
	writeVarUint(value) {
		this._ensure(8);
		const buf = this._buf;
		let pos = this._pos;
		let n = value;
		while (n >= 0x80) {
			buf[pos++] = (n % 128) | 0x80;
			n = Math.floor(n / 128);
		}
		buf[pos++] = n;
		this._pos = pos;
	}

	/**
	 * @param {number} value value
	 * @returns {void}
	 */
	writeVarInt(value) {
		this.writeVarUint(value >= 0 ? value * 2 : value * -2 - 1);
	}

	/**
	 * @param {number} value value
	 * @returns {void}
	 */
	writeF64(value) {
		this._ensure(8);
		this._buf.writeDoubleLE(value, this._pos);
		this._pos += 8;
	}

	/**
	 * @param {Buffer | Uint8Array} bytes bytes
	 * @returns {void}
	 */
	writeBytes(bytes) {
		this._ensure(bytes.length);
		if (Buffer.isBuffer(bytes)) {
			bytes.copy(this._buf, this._pos);
		} else {
			this._buf.set(bytes, this._pos);
		}
		this._pos += bytes.length;
	}

	/**
	 * @param {string} str string
	 * @param {number} byteLength byte length
	 * @returns {void}
	 */
	writeStringRaw(str, byteLength) {
		this._ensure(byteLength);
		this._buf.write(str, this._pos, byteLength, "utf8");
		this._pos += byteLength;
	}

	get length() {
		return this._pos;
	}

	/**
	 * @param {number} pos position
	 * @returns {void}
	 */
	truncate(pos) {
		this._pos = pos;
	}

	toBuffer() {
		return this._buf.subarray(0, this._pos);
	}
}

module.exports = Writer;
