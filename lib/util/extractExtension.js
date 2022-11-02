/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * @param {string} path path to the file (including pseudo url, like `index.js?foo=bar`)
 * @returns {string} file extension or an empty string, in case no extension was found
 */
module.exports = function extractExtension(path) {
	// for handling paths, like "file.ext//"
	let slashIndex = path.length - 1;
	while (path[slashIndex] === "/") {
		slashIndex--;
	}
	const filename = path.slice(0, slashIndex + 1).replace(/^.*[\\/]/, "");

	// for handling paths, like ".file", "/path.to/.file"
	if (filename.charAt(0) === ".") {
		let amountOfDots = 1;
		for (let i = 1; i < filename.length; i++) {
			if (filename[i] === ".") {
				amountOfDots++;
			}

			if (amountOfDots > 1) {
				break;
			}
		}

		if (amountOfDots === 1) {
			return "";
		}
	}

	const extArray = filename.match(/\.([^.]*?)(?=\?|#|$)/);
	if (Array.isArray(extArray) && extArray.length >= 2) {
		return extArray[1];
	}

	return "";
};
