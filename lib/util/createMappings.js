/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Utilities for building V3 source-map `mappings` strings without pulling in a
 * full source-map library. The shape of the input is intentionally minimal —
 * one slot per generated line, each holding zero, one, or many segments — so
 * call sites that have a "one mapping per line" structure (like the CSS-module
 * exports emit in `lib/css/CssGenerator.js`) can build mappings directly,
 * while richer call sites can pass arrays of segments.
 *
 * TODO move this encoder into `webpack-sources` and replace the body of this
 * file with re-exports. The public shape (`encodeVLQ`, `encodeMappings(lines)`,
 * `MappingSegment`, `LineMappings`) is intended to match what would land
 * upstream so call sites don't have to change.
 */

const VLQ_BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a signed integer as a base64 VLQ string per the source-map V3 spec.
 * @param {number} value signed integer to encode
 * @returns {string} base64 VLQ encoded value
 */
const encodeVLQ = (value) => {
	let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
	let result = "";
	do {
		let digit = vlq & 0x1f;
		vlq >>>= 5;
		if (vlq > 0) digit |= 0x20;
		result += VLQ_BASE64[digit];
	} while (vlq > 0);
	return result;
};

/**
 * @typedef {object} MappingSegment
 * @property {number=} generatedColumn 0-based generated column (defaults to 0)
 * @property {number=} sourceIndex index into the surrounding source map's `sources` array; omit for a generated-only segment
 * @property {number=} originalLine 0-based line in the original source (required when `sourceIndex` is set)
 * @property {number=} originalColumn 0-based column in the original source (required when `sourceIndex` is set)
 * @property {number=} nameIndex index into the surrounding source map's `names` array
 */

/** @typedef {null | MappingSegment | MappingSegment[]} LineMappings */

/**
 * Encode a V3 source-map `mappings` string from a per-generated-line
 * description of segments.
 *
 * Each entry of `lines` describes the mappings for one generated line:
 *
 * - `null` (or `undefined`) — the line has no mappings.
 * - a single `MappingSegment` — convenience for the common "one mapping at
 * column 0" case.
 * - `MappingSegment[]` — multiple segments on the same line.
 *
 * Lines are joined with `;`, segments within a line with `,`. All numeric
 * fields are encoded as deltas relative to the previous emitted segment, per
 * the V3 spec.
 * @param {LineMappings[]} lines per-generated-line mapping segments
 * @returns {string} VLQ-encoded V3 mappings string
 */
const encodeMappings = (lines) => {
	let prevSourceIndex = 0;
	let prevOriginalLine = 0;
	let prevOriginalColumn = 0;
	let prevNameIndex = 0;

	const encodedLines = [];

	for (const line of lines) {
		if (line === null || line === undefined) {
			encodedLines.push("");
			continue;
		}

		const segments = Array.isArray(line) ? line : [line];
		let prevGeneratedColumn = 0;
		const encodedSegments = [];

		for (const segment of segments) {
			const generatedColumn = segment.generatedColumn || 0;
			let encoded = encodeVLQ(generatedColumn - prevGeneratedColumn);
			prevGeneratedColumn = generatedColumn;

			if (segment.sourceIndex !== undefined) {
				const originalLine = /** @type {number} */ (segment.originalLine);
				const originalColumn = /** @type {number} */ (segment.originalColumn);
				encoded += encodeVLQ(segment.sourceIndex - prevSourceIndex);
				encoded += encodeVLQ(originalLine - prevOriginalLine);
				encoded += encodeVLQ(originalColumn - prevOriginalColumn);
				prevSourceIndex = segment.sourceIndex;
				prevOriginalLine = originalLine;
				prevOriginalColumn = originalColumn;

				if (segment.nameIndex !== undefined) {
					encoded += encodeVLQ(segment.nameIndex - prevNameIndex);
					prevNameIndex = segment.nameIndex;
				}
			}

			encodedSegments.push(encoded);
		}

		encodedLines.push(encodedSegments.join(","));
	}

	return encodedLines.join(";");
};

module.exports.encodeMappings = encodeMappings;
module.exports.encodeVLQ = encodeVLQ;
