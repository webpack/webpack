/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { decodeVLQ, encodeVLQ } = require("./createMappings");

/** @import { RawSourceMap } from "webpack-sources" */
/** @import { Result } from "../NormalModule" */

/**
 * Returns result without BOM.
 * @param {string | Buffer} strOrBuffer string or buffer
 * @returns {string | Buffer} result without BOM
 */
const removeBOM = (strOrBuffer) => {
	if (typeof strOrBuffer === "string" && strOrBuffer.charCodeAt(0) === 0xfeff) {
		return strOrBuffer.slice(1);
	} else if (
		Buffer.isBuffer(strOrBuffer) &&
		strOrBuffer[0] === 0xef &&
		strOrBuffer[1] === 0xbb &&
		strOrBuffer[2] === 0xbf
	) {
		return strOrBuffer.subarray(3);
	}

	return strOrBuffer;
};

/**
 * A BOM occupies generated column 0 of the first line, so a map describing
 * BOM-prefixed content starts that line at column 1 or later. Removing the BOM
 * moves the line one column left; the segments after the first are encoded
 * relative to it, so only the first is rewritten. A map already starting at
 * column 0 describes the content without its BOM and is left alone.
 * @param {string} mappings VLQ encoded `mappings` of a map for BOM-prefixed content
 * @returns {string} `mappings` for the same content without its BOM
 */
const shiftMappings = (mappings) => {
	const { value, end } = decodeVLQ(mappings, 0);
	if (end === 0 || value <= 0) return mappings;
	return encodeVLQ(value - 1) + mappings.slice(end);
};

/**
 * Adjust a source map that accompanied BOM-prefixed content for the removal of
 * that BOM. Anything without VLQ `mappings` is passed through untouched, as is
 * a map declaring a version other than 3 — earlier versions spell `mappings`
 * differently. A map that declares no version at all is taken as version 3.
 * @param {(string | RawSourceMap)=} sourceMap the map, as an object or as JSON
 * @returns {(string | RawSourceMap)=} the adjusted map
 */
const adjustSourceMapForRemovedBOM = (sourceMap) => {
	if (!sourceMap) return sourceMap;

	if (typeof sourceMap === "string") {
		/** @type {RawSourceMap} */
		let parsed;
		try {
			parsed = JSON.parse(sourceMap);
		} catch (_err) {
			return sourceMap;
		}
		const adjusted = adjustSourceMapForRemovedBOM(parsed);
		return adjusted === parsed ? sourceMap : JSON.stringify(adjusted);
	}

	if (sourceMap.version !== undefined && sourceMap.version !== 3) {
		return sourceMap;
	}

	if (typeof sourceMap.mappings !== "string") return sourceMap;

	const mappings = shiftMappings(sourceMap.mappings);

	return mappings === sourceMap.mappings
		? sourceMap
		: { ...sourceMap, mappings };
};

/**
 * @param {Result} result a loader result: content, an optional source map, extra info
 * @returns {Result} the result with a leading BOM removed from its content and its source map kept in sync
 */
const removeBOMFromResult = (result) => {
	const content = result[0];
	const withoutBOM = removeBOM(content);

	if (withoutBOM === content) return result;

	// Copied rather than rebuilt, so a result carrying no source map keeps its
	// arity.
	const adjusted = /** @type {Result} */ ([...result]);

	adjusted[0] = withoutBOM;

	if (adjusted[1]) adjusted[1] = adjustSourceMapForRemovedBOM(adjusted[1]);

	return adjusted;
};

module.exports.adjustSourceMapForRemovedBOM = adjustSourceMapForRemovedBOM;
module.exports.removeBOM = removeBOM;
module.exports.removeBOMFromResult = removeBOMFromResult;
