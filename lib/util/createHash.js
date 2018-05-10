/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("crypto").Hash} Hash */
/** @typedef {import("crypto").Utf8AsciiLatin1Encoding} Utf8AsciiLatin1Encoding */
/** @typedef {import("crypto").HexBase64Latin1Encoding} HexBase64Latin1Encoding*/
/** @typedef {new(...args:any[]) => Hash & Hash} HashFunctionConstructor */

const BULK_SIZE = 1000;

class BulkUpdateDecorator {
	/**
	 * Creates an instance of BulkUpdateDecorator.
	 * @param {Hash} hash the hash algorithm instance
	 * @memberof BulkUpdateDecorator
	 */
	constructor(hash) {
		this.hash = hash;
		this.buffer = "";
	}

	/**
	 * @description
	 * @param {string | Buffer | DataView} data input data causing hash update
	 * @param {Utf8AsciiLatin1Encoding} inputEncoding encoding used for input
	 * @returns {BulkUpdateDecorator} returns the original BulkUpdateDecorator instance
	 * @memberof BulkUpdateDecorator
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
	 * @description generates a digest string of the current hash
	 * @param {HexBase64Latin1Encoding} encoding the digest encoding format
	 * @returns {string} returns the string value of the digest
	 * @memberof BulkUpdateDecorator
	 */
	digest(encoding) {
		if (this.buffer.length > 0) {
			this.hash.update(this.buffer);
		}
		// var digestResult = this.hash.digest(encoding);
		// return typeof digestResult === "string"
		// 	? digestResult
		// 	: digestResult.toString();
		return this.hash.digest(encoding);
	}
}

/* istanbul ignore next */
class DebugHash {
	constructor() {
		this.string = "";
	}

	/**
	 * @description this triggers a hash update based on new input data
	 * @param {string | Buffer | DataView} data new input data for updated hash
	 * @returns {DebugHash} retuns self instance of DebugHash
	 * @memberof DebugHash
	 */
	update(data) {
		if (typeof data !== "string") {
			data = data.toString();
		}
		this.string += data;
		return this;
	}

	/**
	 * @description converts hash to digested string format
	 * @returns {string} returns a digested hash to string
	 * @memberof DebugHash
	 */
	digest() {
		return this.string.replace(/[^a-z0-9]+/gi, m =>
			Buffer.from(m).toString("hex")
		);
	}
}

/**
 * @description create a hash which can be applied in bulk using specified hashing algo
 * @param {string|HashFunctionConstructor} algorithm either a cyrpto compatible cipher string or separate hashing function
 * @return {DebugHash|BulkUpdateDecorator} creates the instance that manages the hash and hash changes
 */
function createHash(algorithm) {
	if (typeof algorithm === "function") {
		return new BulkUpdateDecorator(new algorithm());
	}
	switch (algorithm) {
		// TODO add non-cryptographic algorithm here
		case "debug":
			return new DebugHash();
		default:
			return new BulkUpdateDecorator(require("crypto").createHash(algorithm));
	}
}

module.exports = createHash;
