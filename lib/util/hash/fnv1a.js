/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Hash = require("../Hash");

/** @typedef {import("../../../declarations/WebpackOptions").HashDigest} Encoding */

/**
 * Pure JavaScript implementation of 64-bit FNV-1a hash.
 * A fast, non-cryptographic hash function that does not require WebAssembly.
 * @see https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 */
class FNV1a64 extends Hash {
	constructor() {
		super();
		// FNV-1a 64-bit offset basis: 0xcbf29ce484222325
		/** @type {number} */
		this.h0 = 0x84222325; // low 32 bits
		/** @type {number} */
		this.h1 = 0xcbf29ce4; // high 32 bits
	}

	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @overload
	 * @param {string | Buffer} data data
	 * @returns {Hash} updated hash
	 */
	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @overload
	 * @param {string} data data
	 * @param {Encoding} inputEncoding data encoding
	 * @returns {Hash} updated hash
	 */
	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @param {string | Buffer} data data
	 * @param {Encoding=} inputEncoding data encoding
	 * @returns {Hash} updated hash
	 */
	update(data, inputEncoding) {
		if (typeof data === "string") {
			data = Buffer.from(data, /** @type {BufferEncoding} */ (inputEncoding));
		}

		// FNV-1a 64-bit prime: 0x00000100000001B3
		// prime_high = 0x100, prime_low = 0x1B3
		let h0 = this.h0 >>> 0;
		let h1 = this.h1 >>> 0;

		for (let i = 0; i < data.length; i++) {
			// XOR the byte into the low word
			h0 ^= data[i];

			// Multiply by FNV-1a 64-bit prime using 32-bit arithmetic
			// h0 * prime_low fits in float64 (max ~2^41)
			const product = h0 * 0x1b3;
			const low = Math.imul(h0, 0x1b3) >>> 0;
			const carry = (product - low) / 4294967296;

			h1 = (Math.imul(h1, 0x1b3) + Math.imul(h0, 0x100) + carry) >>> 0;
			h0 = low;
		}

		this.h0 = h0;
		this.h1 = h1;
		return this;
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @overload
	 * @returns {Buffer} digest
	 */
	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @overload
	 * @param {Encoding} encoding encoding of the return value
	 * @returns {string} digest
	 */
	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @param {Encoding=} encoding encoding of the return value
	 * @returns {string | Buffer} digest
	 */
	digest(encoding) {
		const buf = Buffer.alloc(8);
		buf.writeUInt32BE(this.h1, 0);
		buf.writeUInt32BE(this.h0, 4);
		if (encoding === "hex") return buf.toString("hex");
		if (encoding === "binary" || !encoding) return buf;
		return buf.toString(/** @type {BufferEncoding} */ (encoding));
	}
}

module.exports = FNV1a64;
