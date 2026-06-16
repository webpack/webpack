/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Hash = require("../Hash");
const { digest, update } = require("./hash-digest");
/** @type {number} */
const MAX_SHORT_STRING = require("./wasm-hash").MAX_SHORT_STRING;

/** @typedef {import("../../../declarations/WebpackOptions").HashDigest} Encoding */

class BatchedHash extends Hash {
	/**
	 * Creates an instance of BatchedHash.
	 * @param {Hash} hash hash
	 */
	constructor(hash) {
		super();
		/** @type {undefined | string} */
		this.string = undefined;
		/** @type {undefined | Encoding} */
		this.encoding = undefined;
		/** @type {Hash} */
		this.hash = hash;
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
		const s = this.string;
		const h = this.hash;
		if (typeof data !== "string") {
			if (s !== undefined) {
				update(h, s, this.encoding);
				this.string = undefined;
			}
			update(h, data);
			return this;
		}
		if (s !== undefined) {
			if (
				inputEncoding === this.encoding &&
				s.length + data.length < MAX_SHORT_STRING
			) {
				this.string = s + data;
				return this;
			}
			update(h, s, this.encoding);
			this.string = undefined;
		}
		if (
			data.length < MAX_SHORT_STRING &&
			// base64 encoding is not valid since it may contain padding chars
			(!inputEncoding ||
				inputEncoding.charCodeAt(0) !== 98 ||
				inputEncoding.charCodeAt(1) !== 97)
		) {
			this.string = data;
			this.encoding = inputEncoding;
		} else {
			update(h, data, inputEncoding);
		}
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
		const s = this.string;
		const h = this.hash;
		if (s !== undefined) {
			update(h, s, this.encoding);
			this.string = undefined;
		}
		return digest(h, encoding);
	}
}

module.exports = BatchedHash;
