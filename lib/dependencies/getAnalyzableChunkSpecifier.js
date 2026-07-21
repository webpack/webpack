/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const memoize = require("../util/memoize");
const getModuleUndoPath = require("./getModuleUndoPath");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */

const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);

// Chunk filename tokens only resolved after code generation, so no literal is possible.
const HASH_IN_FILENAME = /\[(?:full|chunk|content)?hash(?::\d+)?\]/;

/**
 * Static literal specifier (already quoted) for a `new URL(<here>, import.meta.url)`
 * that points at `chunk`'s JS file, or `null` when it can't be known statically — a
 * content hash in the filename, or a dynamic/relative publicPath. Shared by the
 * analyzable `new Worker`/worklet emission.
 * @param {string | undefined} overridePublicPath per-dependency public path override (wins over `output.publicPath`)
 * @param {Chunk} chunk the chunk to reference
 * @param {Module} consumingModule the module the reference is emitted into
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Compilation} compilation the compilation
 * @returns {string | null} a JS string literal, or `null` to fall back to the runtime form
 */
const getAnalyzableChunkSpecifier = (
	overridePublicPath,
	chunk,
	consumingModule,
	chunkGraph,
	compilation
) => {
	const { outputOptions } = compilation;
	const filenameTemplate =
		getJavascriptModulesPlugin().getChunkFilenameTemplate(chunk, outputOptions);
	if (
		typeof filenameTemplate !== "string" ||
		HASH_IN_FILENAME.test(filenameTemplate)
	) {
		return null;
	}
	const filename = compilation.getPath(filenameTemplate, {
		chunk,
		contentHashType: JAVASCRIPT_TYPE
	});
	if (overridePublicPath) {
		return overridePublicPath.includes("[")
			? null
			: JSON.stringify(overridePublicPath + filename);
	}
	const { publicPath } = outputOptions;
	if (publicPath === "auto") {
		const undo = getModuleUndoPath(consumingModule, chunkGraph, compilation);
		return undo === null ? null : JSON.stringify(undo + filename);
	}
	if (typeof publicPath === "string" && !publicPath.includes("[")) {
		return JSON.stringify(publicPath + filename);
	}
	return null;
};

module.exports = getAnalyzableChunkSpecifier;
