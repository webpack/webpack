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
 * file with re-exports. The public shape (`encodeVLQ`, `decodeVLQ`,
 * `encodeMappings(lines)`, `MappingSegment`, `LineMappings`) is intended to
 * match what would land upstream so call sites don't have to change.
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
 * Decode one base64 VLQ value per the source-map V3 spec.
 * @param {string} mappings a VLQ encoded `mappings` string
 * @param {number} start index of the value's first character
 * @returns {{ value: number, end: number }} the decoded value and the index just past it; `end` equals `start` when there is no valid value at `start`
 */
const decodeVLQ = (mappings, start) => {
	let value = 0;
	let shift = 0;
	let index = start;
	let digit;
	do {
		digit = index < mappings.length ? VLQ_BASE64.indexOf(mappings[index]) : -1;
		if (digit < 0) return { value: 0, end: start };
		value += (digit & 0x1f) << shift;
		shift += 5;
		index++;
	} while (digit & 0x20);
	return { value: value & 1 ? -(value >>> 1) : value >>> 1, end: index };
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

/** @typedef {[number] | [number, number, number, number] | [number, number, number, number, number]} DecodedSegment generated column, then source index, original line and column, then name index, all 0-based */

/**
 * Decode a V3 `mappings` string into one array of segments per generated line,
 * each sorted by generated column.
 * @param {string} mappings a VLQ encoded `mappings` string
 * @returns {DecodedSegment[][]} the segments of each generated line
 */
const decodeMappings = (mappings) => {
	const { length } = mappings;
	/** @type {DecodedSegment[][]} */
	const lines = [];
	let position = 0;
	let sourceIndex = 0;
	let originalLine = 0;
	let originalColumn = 0;
	let nameIndex = 0;

	/**
	 * @returns {number} the value at `position`, which moves past it
	 */
	const read = () => {
		const { value, end } = decodeVLQ(mappings, position);
		// An invalid character reads as 0 and is skipped, so decoding ends.
		position = end === position ? position + 1 : end;
		// `B`, a negative zero, reads as -2^31 as source-map readers decode it,
		// which sorts it before every column on its line.
		return Object.is(value, -0) ? -2147483648 : value;
	};

	do {
		let lineEnd = mappings.indexOf(";", position);
		if (lineEnd === -1) lineEnd = length;
		/** @type {DecodedSegment[]} */
		const line = [];
		let sorted = true;
		let generatedColumn = 0;
		while (position < lineEnd) {
			const previousColumn = generatedColumn;
			generatedColumn += read();
			if (generatedColumn < previousColumn) sorted = false;
			if (position < lineEnd && mappings[position] !== ",") {
				sourceIndex += read();
				originalLine += read();
				originalColumn += read();
				if (position < lineEnd && mappings[position] !== ",") {
					nameIndex += read();
					line.push([
						generatedColumn,
						sourceIndex,
						originalLine,
						originalColumn,
						nameIndex
					]);
				} else {
					line.push([
						generatedColumn,
						sourceIndex,
						originalLine,
						originalColumn
					]);
				}
			} else {
				line.push([generatedColumn]);
			}
			position++;
		}
		if (!sorted) line.sort((a, b) => a[0] - b[0]);
		lines.push(line);
		position = lineEnd + 1;
	} while (position <= length);
	return lines;
};

/**
 * Encode the segments `decodeMappings` reads back into a V3 `mappings` string.
 * @param {DecodedSegment[][]} lines the segments of each generated line
 * @returns {string} VLQ-encoded V3 mappings string
 */
const encodeDecodedMappings = (lines) => {
	let sourceIndex = 0;
	let originalLine = 0;
	let originalColumn = 0;
	let nameIndex = 0;
	let result = "";
	for (let i = 0; i < lines.length; i++) {
		if (i > 0) result += ";";
		const line = lines[i];
		let generatedColumn = 0;
		for (let j = 0; j < line.length; j++) {
			const segment = line[j];
			if (j > 0) result += ",";
			result += encodeVLQ(segment[0] - generatedColumn);
			generatedColumn = segment[0];
			if (segment.length === 1) continue;
			result += encodeVLQ(segment[1] - sourceIndex);
			result += encodeVLQ(segment[2] - originalLine);
			result += encodeVLQ(segment[3] - originalColumn);
			sourceIndex = segment[1];
			originalLine = segment[2];
			originalColumn = segment[3];
			if (segment.length === 4) continue;
			result += encodeVLQ(segment[4] - nameIndex);
			nameIndex = segment[4];
		}
	}
	return result;
};

module.exports.decodeMappings = decodeMappings;
module.exports.decodeVLQ = decodeVLQ;
module.exports.encodeDecodedMappings = encodeDecodedMappings;
module.exports.encodeMappings = encodeMappings;
module.exports.encodeVLQ = encodeVLQ;
