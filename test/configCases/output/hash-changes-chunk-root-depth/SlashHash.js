"use strict";

const { createHash } = require("crypto");

class SlashHash {
	constructor() {
		this.hash = createHash("sha256");
	}

	/**
	 * @param {string | Buffer} data input
	 * @param {string=} encoding input encoding
	 * @returns {this} hash
	 */
	update(data, encoding) {
		this.hash.update(data, /** @type {import("crypto").Encoding} */ (encoding));
		return this;
	}

	/**
	 * @param {string=} encoding output encoding
	 * @returns {string | Buffer} digest
	 */
	digest(encoding) {
		const bytes = Buffer.concat([
			Buffer.from([0x67, 0xf2, 0x2d]),
			this.hash.digest()
		]);
		return encoding
			? bytes.toString(/** @type {BufferEncoding} */ (encoding))
			: bytes;
	}
}

module.exports = SlashHash;
