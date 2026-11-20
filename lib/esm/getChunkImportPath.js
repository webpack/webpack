/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	getChunkFilenameTemplate
} = require("../javascript/JavascriptModulesPlugin");
const { escapeFilenameForUrl, getUndoPath } = require("../util/identifier");

/** @import Chunk from "../graph/Chunk" */
/** @import Compilation from "../Compilation" */

/**
 * Returns the URL-escaped path one ESM output chunk imports another by, relative to the importing chunk's file.
 * @param {Compilation} compilation the compilation instance
 * @param {Chunk} chunk the imported chunk
 * @param {Chunk} fromChunk the chunk whose file holds the import
 * @returns {string} the relative import path
 */
const getChunkImportPath = (compilation, chunk, fromChunk) => {
	const currentOutputName = compilation
		.getPath(getChunkFilenameTemplate(fromChunk, compilation.outputOptions), {
			chunk: fromChunk,
			runtime: fromChunk.runtime,
			contentHashType: "javascript"
		})
		.replace(/^\/+/g, "")
		.split("/");
	const baseOutputName = [...currentOutputName];
	const chunkOutputName = compilation
		.getPath(getChunkFilenameTemplate(chunk, compilation.outputOptions), {
			chunk,
			runtime: chunk.runtime,
			contentHashType: "javascript"
		})
		.replace(/^\/+/g, "")
		.split("/");

	// remove common parts except filename
	while (
		baseOutputName.length > 1 &&
		chunkOutputName.length > 1 &&
		baseOutputName[0] === chunkOutputName[0]
	) {
		baseOutputName.shift();
		chunkOutputName.shift();
	}
	const last = chunkOutputName.join("/");
	// create final path
	return escapeFilenameForUrl(
		getUndoPath(baseOutputName.join("/"), last, true) + last
	);
};

module.exports = getChunkImportPath;
