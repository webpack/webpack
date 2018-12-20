/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {{new(): Hash}} HashConstructor */
/**
 * @typedef {Object} Hash
 * @property {function(string|Buffer, string=): Hash} update
 * @property {function(string): string} digest
 */

const BULK_SIZE = 1000;

/**
 * @implements {Hash}
 */
class BulkUpdateDecorator {
	constructor(hash) {
		this.hash = hash;
		this.buffer = "";
	}

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

/* istanbul ignore next */
class DebugHash {
	constructor() {
		this.string = "";
	}

	update(data, inputEncoding) {
		if (typeof data !== "string") data = data.toString("utf-8");
		if (data.startsWith("debug-digest-")) {
			data = Buffer.from(data.slice("debug-digest-".length), "hex").toString();
		}
		this.string += `[${data}](${new Error().stack.split("\n")[2]})\n`;
		return this;
	}

	digest(encoding) {
		return "debug-digest-" + Buffer.from(this.string).toString("hex");
	}
}

let crypto = undefined;

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
		default:
			if (crypto === undefined) crypto = require("crypto");
			return new BulkUpdateDecorator(crypto.createHash(algorithm));
	}
};
