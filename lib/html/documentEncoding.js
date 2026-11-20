/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// a global only from Node.js 11, and `lib` runs on 10.13
// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");
const { declaredCharset } = require("./syntax-parser");

/** @import Module from "../module/Module" */
/** @import { HtmlModuleBuildInfo } from "./HtmlModule" */

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

/** @type {Map<DocumentEncoding, Map<string, string>>} */
const encoders = new Map();

/**
 * The bytes each character the encoding holds is written as, one character per
 * byte, read off its decoder: Node.js decodes every encoding but encodes UTF-8 only.
 * @param {DocumentEncoding} encoding the encoding
 * @returns {Map<string, string>} the bytes of each character
 */
const getEncoder = (encoding) => {
	let encoder = encoders.get(encoding);
	if (encoder !== undefined) return encoder;
	encoder = new Map();
	const decoder = new TextDecoder(encoding, { fatal: true });
	/**
	 * Records the character a byte sequence decodes to, the first one seen winning.
	 * @param {Buffer} bytes the bytes
	 */
	const add = (bytes) => {
		let char;
		try {
			char = decoder.decode(bytes);
		} catch (_err) {
			return;
		}
		// a sequence decoding to two characters is two characters, not this one
		if (char.length === 0 || [...char].length !== 1) return;
		if (!encoder.has(char)) encoder.set(char, bytes.toString("latin1"));
	};
	for (let byte = 0x80; byte <= 0xff; byte++) add(Buffer.from([byte]));
	// an encoding with a character for every byte has no two-byte sequence
	if (encoder.size === 0x80) {
		encoders.set(encoding, encoder);
		return encoder;
	}
	for (let lead = 0x81; lead <= 0xfe; lead++) {
		for (let trail = 0x40; trail <= 0xfe; trail++) {
			add(Buffer.from([lead, trail]));
		}
	}
	encoders.set(encoding, encoder);
	return encoder;
};

/**
 * A character reference, which markup reads as the character.
 * @param {number} codePoint the character
 * @returns {string} the reference
 */
const escapeHtmlCodePoint = (codePoint) => `&#x${codePoint.toString(16)};`;

/**
 * A CSS escape, which a stylesheet reads as the character.
 * @param {number} codePoint the character
 * @returns {string} the escape
 */
const escapeCssCodePoint = (codePoint) => `\\${codePoint.toString(16)} `;

/**
 * A `\u` escape of each UTF-16 unit, which a script reads as the character in a
 * string, a template, a regular expression and an identifier alike.
 * @param {number} codePoint the character
 * @returns {string} the escape
 */
const escapeJsCodePoint = (codePoint) => {
	const char = String.fromCodePoint(codePoint);
	let escaped = "";
	for (let i = 0; i < char.length; i++) {
		escaped += `\\u${char.charCodeAt(i).toString(16).padStart(4, "0")}`;
	}
	return escaped;
};

const NON_ASCII_REGEXP = /[^\0-\u007F]/;
const BYTE_RUN_REGEXP = /[\0-\u00FF]+/g;
const WIDE_RUN_REGEXP = /[^\0-\u00FF]+/g;

/**
 * Whether text taken from a page holds a character its bytes do not spell out:
 * ISO-2022-JP writes Japanese with ASCII bytes behind an escape.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {boolean} whether it has to be decoded
 */
const needsDecoding = (text, encoding) =>
	NON_ASCII_REGEXP.test(text) ||
	(encoding === "iso-2022-jp" && text.includes("\u001B"));

/**
 * The characters of text taken from a page (see `decodeDocument`). A character
 * above U+00FF is one a step put there, and is kept.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {string} the characters
 */
const fromDocument = (text, encoding) => {
	if (encoding.startsWith("utf-16") || !needsDecoding(text, encoding)) {
		return text;
	}
	const decoder = new TextDecoder(encoding);
	return text.replace(BYTE_RUN_REGEXP, (run) =>
		decoder.decode(Buffer.from(run, "latin1"))
	);
};

/**
 * The characters of text taken from a page, as `fromDocument` gives them, with
 * the offset in the text each one starts at, for an edit at the bytes it came from.
 * @param {string} text the text
 * @param {DocumentEncoding} encoding the page's encoding
 * @returns {{ text: string, map: number[] | undefined }} the characters, and their offsets when any moved
 */
const fromDocumentWithMap = (text, encoding) => {
	if (encoding.startsWith("utf-16") || !needsDecoding(text, encoding)) {
		return { text, map: undefined };
	}
	const decoder = new TextDecoder(encoding);
	let result = "";
	/** @type {number[]} */
	const map = [];
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// a character a step put there is kept, as `fromDocument` keeps it
		const chars =
			code > 0xff
				? decoder.decode() + text[i]
				: decoder.decode(Buffer.from([code]), { stream: true });
		for (let j = 0; j < chars.length; j++) map.push(start);
		result += chars;
		if (chars.length > 0) start = i + 1;
	}
	const rest = decoder.decode();
	for (let j = 0; j < rest.length; j++) map.push(start);
	result += rest;
	map.push(text.length);
	return { text: result, map };
};

/**
 * Characters put into a page (see `decodeDocument`): each one the encoding holds
 * as its bytes, any other escaped for where it goes.
 * @param {string} text the characters
 * @param {DocumentEncoding} encoding the page's encoding
 * @param {(codePoint: number) => string} escape escapes a character the encoding lacks
 * @returns {string} the text
 */
const toDocument = (text, encoding, escape) => {
	if (encoding.startsWith("utf-16") || !NON_ASCII_REGEXP.test(text)) {
		return text;
	}
	const encoder = getEncoder(encoding);
	let result = "";
	for (const char of text) {
		const code = /** @type {number} */ (char.codePointAt(0));
		if (code < 0x80) {
			result += char;
			continue;
		}
		const bytes = encoder.get(char);
		result += bytes === undefined ? escape(code) : bytes;
	}
	return result;
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
	// a character above U+00FF is one a step put there, so not one of the bytes
	return Buffer.from(
		text.replace(WIDE_RUN_REGEXP, (run) =>
			toDocument(run, encoding, escapeHtmlCodePoint)
		),
		"latin1"
	);
};

/**
 * Characters a step puts into a page module, in the page's encoding.
 * @param {Module} page the page module
 * @param {string} text the characters
 * @param {(codePoint: number) => string} escape escapes a character the encoding lacks
 * @returns {string} the text
 */
const toPage = (page, text, escape) => {
	const { encoding } = /** @type {HtmlModuleBuildInfo} */ (page.buildInfo);
	return encoding === undefined ? text : toDocument(text, encoding, escape);
};

module.exports.decodeDocument = decodeDocument;
module.exports.encodeDocument = encodeDocument;
module.exports.escapeCssCodePoint = escapeCssCodePoint;
module.exports.escapeHtmlCodePoint = escapeHtmlCodePoint;
module.exports.escapeJsCodePoint = escapeJsCodePoint;
module.exports.fromDocument = fromDocument;
module.exports.fromDocumentWithMap = fromDocumentWithMap;
module.exports.getDocumentEncoding = getDocumentEncoding;
module.exports.toDocument = toDocument;
module.exports.toPage = toPage;
