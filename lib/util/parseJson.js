/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const JSONParseError = require("../errors/JSONParseError");

/** @typedef {import("../util/fs").JsonValue} JsonValue */

// Inspired by https://github.com/npm/json-parse-even-better-errors

// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
// because the buffer-to-string conversion in `fs.readFileSync()`
// translates it to FEFF, the UTF-16 BOM.
/**
 * @param {string | Buffer} txt text
 * @returns {string} text without BOM
 */
const stripBOM = (txt) => String(txt).replace(/^\uFEFF/, "");

/**
 * @template [R=JsonValue]
 * @callback ParseJsonFn
 * @param {string} raw text
 * @param {(this: EXPECTED_ANY, key: string, value: EXPECTED_ANY) => EXPECTED_ANY=} reviver reviver
 * @returns {R} parsed JSON
 */

/** @type {ParseJsonFn} */
const parseJson = (raw, reviver) => {
	const txt = stripBOM(raw);

	try {
		return JSON.parse(txt, reviver);
	} catch (err) {
		throw new JSONParseError(/** @type {Error} */ (err), raw, txt);
	}
};

module.exports = parseJson;
