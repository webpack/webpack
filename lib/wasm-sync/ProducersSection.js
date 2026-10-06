/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sarthak Singh @sarthak0116
*/

"use strict";

// https://github.com/WebAssembly/tool-conventions/blob/main/ProducersSection.md

const PRODUCERS_SECTION = "producers";
const PROCESSED_BY_FIELD = "processed-by";
const CUSTOM_SECTION_ID = 0;
// The magic number and the version, which precede the sections.
const HEADER_SIZE = 8;
// The order the conventions list the fields in.
const FIELD_ORDER = ["language", PROCESSED_BY_FIELD, "sdk"];

/**
 * Reads an unsigned LEB128 integer of at most 32 bits.
 * @param {Buffer} buffer the buffer
 * @param {number} offset where the integer starts
 * @returns {[number, number]} the value and the offset behind it
 */
const readU32 = (buffer, offset) => {
	let result = 0;
	for (let shift = 0; shift < 35; shift += 7) {
		if (offset >= buffer.length) throw new Error("Unexpected end of module");
		const byte = buffer[offset++];
		result += (byte & 0x7f) * 2 ** shift;
		if ((byte & 0x80) === 0) return [result, offset];
	}
	throw new Error("Invalid LEB128 integer");
};

/**
 * Writes an unsigned LEB128 integer.
 * @param {number} value the value
 * @returns {Buffer} the encoding
 */
const writeU32 = (value) => {
	/** @type {number[]} */
	const bytes = [];
	do {
		const byte = value % 128;
		value = Math.floor(value / 128);
		bytes.push(value > 0 ? byte | 0x80 : byte);
	} while (value > 0);
	return Buffer.from(bytes);
};

/**
 * Reads a length-prefixed UTF-8 name.
 * @param {Buffer} buffer the buffer
 * @param {number} offset where the name starts
 * @returns {[string, number]} the name and the offset behind it
 */
const readName = (buffer, offset) => {
	const [length, start] = readU32(buffer, offset);
	const end = start + length;
	if (end > buffer.length) throw new Error("Unexpected end of module");
	return [buffer.toString("utf8", start, end), end];
};

/**
 * Writes a length-prefixed UTF-8 name.
 * @param {string} name the name
 * @returns {Buffer} the encoding
 */
const writeName = (name) => {
	const bytes = Buffer.from(name, "utf8");
	return Buffer.concat([writeU32(bytes.length), bytes]);
};

/** @typedef {Map<string, Map<string, string>>} Producers field name to (tool name to version) */

/**
 * Decodes the payload of a producers section.
 * @param {Buffer} payload what follows the section name
 * @returns {Producers} the fields
 */
const decodeProducers = (payload) => {
	/** @type {Producers} */
	const fields = new Map();
	let [fieldCount, offset] = readU32(payload, 0);
	while (fieldCount-- > 0) {
		let fieldName;
		[fieldName, offset] = readName(payload, offset);
		let valueCount;
		[valueCount, offset] = readU32(payload, offset);
		/** @type {Map<string, string>} */
		const values = new Map();
		while (valueCount-- > 0) {
			let name;
			let version;
			[name, offset] = readName(payload, offset);
			[version, offset] = readName(payload, offset);
			values.set(name, version);
		}
		fields.set(fieldName, values);
	}
	if (offset !== payload.length) throw new Error("Trailing bytes");
	return fields;
};

/**
 * Encodes the payload of a producers section.
 * @param {Producers} fields the fields
 * @returns {Buffer} the payload
 */
const encodeProducers = (fields) => {
	// Fields the conventions know come first, in their order; unknown ones keep theirs.
	const names = [...fields.keys()].sort((a, b) => {
		const rankA = FIELD_ORDER.indexOf(a);
		const rankB = FIELD_ORDER.indexOf(b);
		return (
			(rankA === -1 ? FIELD_ORDER.length : rankA) -
			(rankB === -1 ? FIELD_ORDER.length : rankB)
		);
	});
	const parts = [writeU32(names.length)];
	for (const name of names) {
		const values = /** @type {Map<string, string>} */ (fields.get(name));
		parts.push(writeName(name), writeU32(values.size));
		for (const [tool, version] of values) {
			parts.push(writeName(tool), writeName(version));
		}
	}
	return Buffer.concat(parts);
};

/**
 * Records a tool in the `processed-by` field of the producers section, next to
 * the producers already named there. A module that cannot be read, or whose
 * producers section cannot be, is returned as it is.
 * @param {Buffer} binary the WebAssembly binary
 * @param {string} tool the name of the tool
 * @param {string} version the version of the tool
 * @returns {Buffer} the binary
 */
const addProcessedBy = (binary, tool, version) => {
	try {
		/** @type {Buffer[]} */
		const kept = [binary.subarray(0, HEADER_SIZE)];
		/** @type {Producers} */
		let fields = new Map();
		let offset = HEADER_SIZE;
		while (offset < binary.length) {
			const sectionStart = offset;
			const id = binary[offset++];
			let size;
			[size, offset] = readU32(binary, offset);
			const end = offset + size;
			if (end > binary.length) return binary;
			if (id === CUSTOM_SECTION_ID) {
				const [name, payloadStart] = readName(binary, offset);
				if (name === PRODUCERS_SECTION) {
					fields = decodeProducers(binary.subarray(payloadStart, end));
					offset = end;
					continue;
				}
			}
			kept.push(binary.subarray(sectionStart, end));
			offset = end;
		}

		let processedBy = fields.get(PROCESSED_BY_FIELD);
		if (processedBy === undefined) {
			processedBy = new Map();
			fields.set(PROCESSED_BY_FIELD, processedBy);
		}
		processedBy.set(tool, version);

		const name = writeName(PRODUCERS_SECTION);
		const payload = encodeProducers(fields);
		kept.push(
			Buffer.from([CUSTOM_SECTION_ID]),
			writeU32(name.length + payload.length),
			name,
			payload
		);
		return Buffer.concat(kept);
	} catch (_err) {
		return binary;
	}
};

module.exports.addProcessedBy = addProcessedBy;
module.exports.decodeProducers = decodeProducers;
