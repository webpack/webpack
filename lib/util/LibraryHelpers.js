/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

/**
 * Determine library type from chunk entry options or compilation output options
 * @param {Chunk} chunk The chunk to get library type for
 * @param {Compilation} compilation The compilation
 * @returns {LibraryType | undefined} The library type or undefined
 */
module.exports.getLibraryType = (chunk, compilation) => {
	const entryOptions = chunk.getEntryOptions();
	const libraryType =
		entryOptions && entryOptions.library !== undefined
			? entryOptions.library.type
			: compilation.outputOptions.library &&
				  typeof compilation.outputOptions.library === "object" &&
				  !Array.isArray(compilation.outputOptions.library)
				? compilation.outputOptions.library.type
				: undefined;
	return libraryType;
};
