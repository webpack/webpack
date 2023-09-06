/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const AbstractMethodError = require("../AbstractMethodError");

const BULK_SIZE = 1000;

class Hash {
	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @param {string|Buffer} data data
	 * @param {string=} inputEncoding data encoding
	 * @returns {this} updated hash
	 */
	update(data, inputEncoding) {
		throw new AbstractMethodError();
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @param {string=} encoding encoding of the return value
	 * @returns {string|Buffer} digest
	 */
	digest(encoding) {
		throw new AbstractMethodError();
	}
}

class BulkUpdateDecorator extends Hash {
	/**
	 * @param {Hash} hash hash
	 */
	constructor(hash) {
		super();
		this.hash = hash;
		this.buffer = "";
	}

	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @param {string|Buffer} data data
	 * @param {string=} inputEncoding data encoding
	 * @returns {this} updated hash
	 */
	update(data, inputEncoding) {
		if (
			inputEncoding !== undefined ||
			typeof data !== "string" ||
			data.length > BULK_SIZE
		) {
			if (this.buffer.length > 0) {
				this.hash.update(this.buffer);
				this.buffer = "";
			}
			this.hash.update(data, inputEncoding);
		} else {
			this.buffer += data;
			if (this.buffer.length > BULK_SIZE) {
				this.hash.update(this.buffer);
				this.buffer = "";
			}
		}
		return this;
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @param {string=} encoding encoding of the return value
	 * @returns {string|Buffer} digest
	 */
	digest(encoding) {
		if (this.buffer.length > 0) {
			this.hash.update(this.buffer);
		}
		var digestResult = this.hash.digest(encoding);
		return typeof digestResult === "string"
			? digestResult
			: digestResult.toString();
	}
}

/**
 * istanbul ignore next
 */
class DebugHash extends Hash {
	constructor() {
		super();
		this.string = "";
	}

	/**
	 * Update hash {@link https://nodejs.org/api/crypto.html#crypto_hash_update_data_inputencoding}
	 * @param {string|Buffer} data data
	 * @param {string=} inputEncoding data encoding
	 * @returns {this} updated hash
	 */
	update(data, inputEncoding) {
		if (typeof data !== "string") data = data.toString("utf-8");
		this.string += data;
		return this;
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @param {string=} encoding encoding of the return value
	 * @returns {string|Buffer} digest
	 */
	digest(encoding) {
		return this.string.replace(/[^a-z0-9]+/gi, m =>
			Buffer.from(m).toString("hex")
		);
	}
}

/** @type {typeof import("crypto") | undefined} */
let crypto = undefined;
/** @type {typeof import("./hash/md4") | undefined} */
let createMd4 = undefined;
/** @type {typeof import("./hash/BatchedHash") | undefined} */
let BatchedHash = undefined;

/** @type {number} */
const NODE_MAJOR_VERSION = parseInt(process.versions.node, 10);

/**
 * Creates a hash by name or function
 * @param {string | HashConstructor} algorithm the algorithm name or a constructor creating a hash
 * @returns {Hash} the hash
 */
module.exports = algorithm => {
	if (typeof algorithm === "function") {
		return new BulkUpdateDecorator(new algorithm());
	}

	switch (algorithm) {
		// TODO add non-cryptographic algorithm here
		case "debug":
			return new DebugHash();
		case "md4":
			if (NODE_MAJOR_VERSION >= 18) {
				if (createMd4 === undefined) {
					createMd4 = require("./hash/md4");
					if (BatchedHash === undefined) {
						BatchedHash = require("./hash/BatchedHash");
					}
				}
				return new /** @type {typeof import("./hash/BatchedHash")} */ (BatchedHash)(
					createMd4()
				);
			}
		// If we are on Node.js < 18, fall through to the default case
		// eslint-disable-next-line no-fallthrough

		case "native-md4":
			if (NODE_MAJOR_VERSION >= 18) {
				if (crypto === undefined) crypto = require("crypto");
				return new BulkUpdateDecorator(
					/** @type {typeof import("crypto")} */ (crypto).createHash("md4")
				);
			}
		// If we are on Node.js < 18, fall through to the default case
		// eslint-disable-next-line no-fallthrough

		default:
			if (crypto === undefined) crypto = require("crypto");
			return new BulkUpdateDecorator(crypto.createHash(algorithm));
	}
};

module.exports.Hash = Hash;
/** @typedef {typeof Hash} HashConstructor */
