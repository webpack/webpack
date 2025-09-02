"use strict";

const { createHash } = require("crypto");

/** @typedef {import("crypto").Encoding} Encoding */
/** @typedef {import("crypto").BinaryToTextEncoding} BinaryToTextEncoding */

class SHA256Hash {
	constructor() {
		this._hash = createHash("sha256");
	}

	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @abstract
	 * @param {string | Buffer} data data
	 * @param {Encoding=} inputEncoding data encoding
	 * @returns {this} updated hash
	 */
	update(data, inputEncoding) {
		this._hash.update(
			/** @type {string} */
			(data),
			/** @type {Encoding} */
			(inputEncoding)
		);

		return this;
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @abstract
	 * @param {BinaryToTextEncoding=} encoding encoding of the return value
	 * @returns {string | Buffer} digest
	 */
	digest(encoding) {
		return this._hash.digest(/** @type {BinaryToTextEncoding} */ (encoding));
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		hashDigest: "base64",
		hashDigestLength: 25,
		hashFunction: SHA256Hash,
		hashSalt: "salt"
	}
};
