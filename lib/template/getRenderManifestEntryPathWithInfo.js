/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @import Compilation, { InterpolatedPathAndAssetInfo } from "../Compilation" */
/**
 * @import {
 * 	RenderManifestEntryChunkTemplated,
 * 	RenderManifestEntryTemplated
 * } from "./Template"
 */

/**
 * Whether a templated render manifest entry is named by a chunk's filename
 * template function, which only reads a chunk's path data.
 * @param {RenderManifestEntryTemplated} entry the entry
 * @returns {entry is RenderManifestEntryChunkTemplated} whether its template is a function
 */
const isChunkTemplated = (entry) =>
	typeof entry.filenameTemplate === "function";

/**
 * Interpolates a templated render manifest entry's filename. A function
 * template only reads a chunk's path data, while a string template takes any.
 * @param {Compilation} compilation the compilation
 * @param {RenderManifestEntryTemplated} entry the entry
 * @returns {InterpolatedPathAndAssetInfo} interpolated path and asset info
 */
const getRenderManifestEntryPathWithInfo = (compilation, entry) =>
	isChunkTemplated(entry)
		? compilation.getPathWithInfo(entry.filenameTemplate, entry.pathOptions)
		: compilation.getPathWithInfo(entry.filenameTemplate, entry.pathOptions);

module.exports = getRenderManifestEntryPathWithInfo;
