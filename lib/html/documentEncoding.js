/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// a global only from Node.js 11, and `lib` runs on 10.13
// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");
const { declaredCharset } = require("./syntax-parser");

/**
 * The encoding a page's bytes are kept in when it is not UTF-8: `utf-16le` or
 * `utf-16be` by its byte order mark, or the name of the encoding its `<meta>`
 * declares, which keeps ASCII as ASCII, so the page is read byte for byte.
 * @typedef {string} DocumentEncoding
 */

/**
 * The encoding of a page's bytes, as a browser finds it before reading them.
 * @param {Buffer} buffer the page's bytes
 * @returns {DocumentEncoding | undefined} the encoding, or undefined for UTF-8
 */
const getDocumentEncoding = (buffer) => {
	if (buffer[0] === 0xff && buffer[1] === 0xfe) return "utf-16le";
	if (buffer[0] === 0xfe && buffer[1] === 0xff) return "utf-16be";
	if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return;
	const label = declaredCharset(buffer.toString("latin1", 0, 1024));
	if (label === undefined) return;
	/** @type {string} */
	let encoding;
	try {
		encoding = new TextDecoder(label.trim()).encoding;
	} catch (_err) {
		// a label the runtime cannot decode is read as UTF-8, as before
		return;
	}
	// UTF-8, or a `<meta>` naming UTF-16, which means UTF-8 to a browser too
	if (/^utf-(?:8$|16)/.test(encoding)) return;
	return encoding;
};

/**
 * The text webpack works on: a UTF-16 page's characters, or one character per
 * byte of a page in another encoding, so its bytes are written back unchanged.
 * @param {Buffer} buffer the page's bytes
 * @param {DocumentEncoding} encoding its encoding
 * @returns {string} the text
 */
const decodeDocument = (buffer, encoding) => {
	if (encoding === "utf-16le") return buffer.toString("utf16le", 2);
	if (encoding === "utf-16be") {
		const bytes = Buffer.from(buffer.subarray(2, buffer.length & ~1));
		return bytes.swap16().toString("utf16le");
	}
	return buffer.toString("latin1");
};

/**
 * The bytes of a page's text in its own encoding (see `decodeDocument`).
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {Buffer} the bytes
 */
const encodeDocument = (text, encoding) => {
	if (encoding === "utf-16le") {
		return Buffer.concat([
			Buffer.from([0xff, 0xfe]),
			Buffer.from(text, "utf16le")
		]);
	}
	if (encoding === "utf-16be") {
		return Buffer.concat([
			Buffer.from([0xfe, 0xff]),
			Buffer.from(text, "utf16le").swap16()
		]);
	}
	return Buffer.from(text, "latin1");
};

/**
 * The characters of a page's text (see `decodeDocument`), as a string export
 * of the page holds them.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {string} the characters
 */
const documentText = (text, encoding) =>
	encoding.startsWith("utf-16")
		? text
		: new TextDecoder(encoding).decode(Buffer.from(text, "latin1"));

module.exports.decodeDocument = decodeDocument;
module.exports.documentText = documentText;
module.exports.encodeDocument = encodeDocument;
module.exports.getDocumentEncoding = getDocumentEncoding;
