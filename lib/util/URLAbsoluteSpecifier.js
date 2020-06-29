/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { getMimetype: getDataUrlMimetype } = require("./DataURI");

/** @typedef {import("./fs").InputFileSystem} InputFileSystem */
/** @typedef {(error: Error|null, result?: Buffer) => void} ErrorFirstCallback */

const backSlashCharCode = "\\".charCodeAt(0);
const aLowerCaseCharCode = "a".charCodeAt(0);
const zLowerCaseCharCode = "z".charCodeAt(0);
const aUpperCaseCharCode = "A".charCodeAt(0);
const zUpperCaseCharCode = "Z".charCodeAt(0);
const _0CharCode = "0".charCodeAt(0);
const _9CharCode = "9".charCodeAt(0);
const plusCharCode = "+".charCodeAt(0);
const hyphenCharCode = "-".charCodeAt(0);
const colonCharCode = ":".charCodeAt(0);
/**
 * Get scheme if specifier is an absolute URL specifier
 * e.g. Absolute specifiers like 'file:///user/webpack/index.js'
 * https://tools.ietf.org/html/rfc3986#section-3.1
 * @param {string} specifier specifier
 * @returns {string|undefined} scheme if absolute URL specifier provided
 */
function getScheme(specifier) {
	const start = specifier.charCodeAt(0);

	// First char maybe only a letter
	if (
		(start < aLowerCaseCharCode || start > zLowerCaseCharCode) &&
		(start < aUpperCaseCharCode || start > zUpperCaseCharCode)
	)
		return undefined;

	let i = 1;
	let ch = specifier.charCodeAt(i);

	while (
		(ch >= aLowerCaseCharCode && ch <= zLowerCaseCharCode) ||
		(ch >= aUpperCaseCharCode && ch <= zUpperCaseCharCode) ||
		(ch >= _0CharCode && ch <= _9CharCode) ||
		ch === plusCharCode ||
		ch === hyphenCharCode
	) {
		if (++i === specifier.length) return undefined;
		ch = specifier.charCodeAt(i);
	}

	// Scheme must end with colon
	if (ch !== colonCharCode) return undefined;
	// Check for Windows absolute path
	if (specifier.charCodeAt(i + 1) === backSlashCharCode) return undefined;

	return specifier.slice(0, i).toLowerCase();
}

/**
 * @param {string} specifier specifier
 * @returns {string|null} protocol if absolute URL specifier provided
 */
function getProtocol(specifier) {
	return getScheme(specifier) + ":";
}

/**
 * @param {string} scheme protocol
 * @param {string} specifier specifier
 * @returns {string} mimetype if exists
 */
function getMimetype(scheme, specifier) {
	switch (scheme) {
		case "data":
			return getDataUrlMimetype(specifier);
		default:
			return "";
	}
}

exports.getScheme = getScheme;
exports.getMimetype = getMimetype;
exports.getProtocol = getProtocol;
