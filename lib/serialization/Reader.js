/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class Reader {
	/**
	 * @param {Buffer | Buffer[]} buffer buffer
	 * @param {number=} pos position
	 */
	constructor(buffer, pos = 0) {
		this._buf = Array.isArray(buffer) ? Buffer.concat(buffer) : buffer;
		this._pos = pos;
	}

	readU8() {
		return this._buf[this._pos++];
	}

	readU32() {
		const value = this._buf.readUInt32LE(this._pos);
		this._pos += 4;
		return value;
	}

	readVarUint() {
		const buf = this._buf;
		let pos = this._pos;
		let result = 0;
		let factor = 1;
		let byte;
		do {
			byte = buf[pos++];
			result += (byte & 0x7f) * factor;
			factor *= 128;
		} while (byte >= 0x80);
		this._pos = pos;
		return result;
	}

	readVarInt() {
		const u = this.readVarUint();
		return u % 2 === 0 ? u / 2 : -(u + 1) / 2;
	}

	readF64() {
		const value = this._buf.readDoubleLE(this._pos);
		this._pos += 8;
		return value;
	}

	/**
	 * @param {number} n byte count
	 * @returns {Buffer} bytes
	 */
	readBytes(n) {
		const value = this._buf.subarray(this._pos, this._pos + n);
		this._pos += n;
		return value;
	}

	/**
	 * @param {number} n byte count
	 * @returns {Buffer} bytes
	 */
	readBytesCopy(n) {
		const value = Buffer.allocUnsafe(n);
		this._buf.copy(value, 0, this._pos, this._pos + n);
		this._pos += n;
		return value;
	}

	/**
	 * @param {number} byteLength byte length
	 * @returns {string} string
	 */
	readString(byteLength) {
		const value = this._buf.toString("utf8", this._pos, this._pos + byteLength);
		this._pos += byteLength;
		return value;
	}

	get eof() {
		return this._pos >= this._buf.length;
	}
}

module.exports = Reader;
