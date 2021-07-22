/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Hash = require("./Hash");

const BULK_SIZE = 2000;

// We are using an object instead of a Map as this will stay static during the runtime
// so access to it can be optimized by v8
const digestCaches = {};

class BulkUpdateDecorator extends Hash {
	/**
	 * @param {Hash | function(): Hash} hashOrFactory function to create a hash
	 * @param {string=} hashKey key for caching
	 */
	constructor(hashOrFactory, hashKey) {
		super();
		this.hashKey = hashKey;
		if (typeof hashOrFactory === "function") {
			this.hashFactory = hashOrFactory;
			this.hash = undefined;
		} else {
			this.hashFactory = undefined;
			this.hash = hashOrFactory;
		}
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
			if (this.hash === undefined) this.hash = this.hashFactory();
			if (this.buffer.length > 0) {
				this.hash.update(this.buffer);
				this.buffer = "";
			}
			this.hash.update(data, inputEncoding);
		} else {
			this.buffer += data;
			if (this.buffer.length > BULK_SIZE) {
				if (this.hash === undefined) this.hash = this.hashFactory();
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
		let digestCache;
		const buffer = this.buffer;
		if (this.hash === undefined) {
			// short data for hash, we can use caching
			const cacheKey = `${this.hashKey}-${encoding}`;
			digestCache = digestCaches[cacheKey];
			if (digestCache === undefined) {
				digestCache = digestCaches[cacheKey] = new Map();
			}
			const cacheEntry = digestCache.get(buffer);
			if (cacheEntry !== undefined) return cacheEntry;
			this.hash = this.hashFactory();
		}
		if (buffer.length > 0) {
			this.hash.update(buffer);
		}
		const digestResult = this.hash.digest(encoding);
		const result =
			typeof digestResult === "string" ? digestResult : digestResult.toString();
		if (digestCache !== undefined) {
			digestCache.set(buffer, result);
		}
		return result;
	}
}

/* istanbul ignore next */
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
		if (data.startsWith("debug-digest-")) {
			data = Buffer.from(data.slice("debug-digest-".length), "hex").toString();
		}
		this.string += `[${data}](${new Error().stack.split("\n", 3)[2]})\n`;
		return this;
	}

	/**
	 * Calculates the digest {@link https://nodejs.org/api/crypto.html#crypto_hash_digest_encoding}
	 * @param {string=} encoding encoding of the return value
	 * @returns {string|Buffer} digest
	 */
	digest(encoding) {
		return "debug-digest-" + Buffer.from(this.string).toString("hex");
	}
}

let crypto = undefined;

/**
 * Creates a hash by name or function
 * @param {string | typeof Hash} algorithm the algorithm name or a constructor creating a hash
 * @returns {Hash} the hash
 */
module.exports = algorithm => {
	if (typeof algorithm === "function") {
		return new BulkUpdateDecorator(() => new algorithm());
	}
	switch (algorithm) {
		// TODO add non-cryptographic algorithm here
		case "debug":
			return new DebugHash();
		default:
			if (crypto === undefined) crypto = require("crypto");
			return new BulkUpdateDecorator(
				() => crypto.createHash(algorithm),
				algorithm
			);
	}
};
