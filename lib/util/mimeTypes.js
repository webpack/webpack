/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { extname } = require("path");
const db = require("mime-db");

/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" / "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const TYPE_REGEXP =
	/^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
const extensions = Object.create(null);
const types = Object.create(null);

// source preference (least -> most)
const PREFERENCE = ["nginx", "apache", undefined, "iana"];

/**
 * @param {Record<string, readonly string[]>} extensions extensions
 * @param {Record<string, string>} types types
 */
const populate = (extensions, types) => {
	for (const type of Object.keys(db)) {
		const mime = db[type];
		const exts = mime.extensions;

		if (!exts || !exts.length) {
			continue;
		}

		// mime -> extensions
		extensions[type] = exts;

		// extension -> mime
		for (let i = 0; i < exts.length; i++) {
			const extension = exts[i];

			if (types[extension]) {
				const from = PREFERENCE.indexOf(db[types[extension]].source);
				const to = PREFERENCE.indexOf(mime.source);

				if (
					types[extension] !== "application/octet-stream" &&
					(from > to ||
						(from === to && types[extension].slice(0, 12) === "application/"))
				) {
					// skip the remapping
					continue;
				}
			}

			// set the extension -> mime
			types[extension] = type;
		}
	}
};

populate(extensions, types);

/**
 * Get the default extension for a MIME type.
 * @param {string} type type
 * @returns {undefined | string} resolve extension
 */
const extension = (type) => {
	if (!type) {
		return;
	}

	const match = TYPE_REGEXP.exec(type);

	if (!match) {
		return;
	}

	const possibleExtensions = extensions[match[0].toLowerCase()];

	if (!possibleExtensions || possibleExtensions.length === 0) {
		return;
	}

	return possibleExtensions[0];
};

/**
 * Lookup the MIME type for a file path/extension.
 * @param {string} path path
 * @returns {undefined | string} resolved MIME type
 */
const lookup = (path) => {
	if (!path) {
		return;
	}

	// get the extension ("ext" or ".ext" or full path)
	const extension = extname(`x.${path}`).toLowerCase().slice(1);

	if (!extension) {
		return;
	}

	return types[extension];
};

module.exports = { extension, lookup };
