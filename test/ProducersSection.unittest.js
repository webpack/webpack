"use strict";

const {
	addProcessedBy,
	decodeProducers
} = require("../lib/wasm-sync/ProducersSection");

const HEADER = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
// An empty type section, so there is a section ahead of the producers.
const TYPE_SECTION = Buffer.from([0x01, 0x01, 0x00]);

/**
 * @param {string} value a name
 * @returns {Buffer} the length-prefixed name
 */
const name = (value) =>
	Buffer.concat([Buffer.from([Buffer.byteLength(value)]), Buffer.from(value)]);

/**
 * @param {Buffer} payload the section content
 * @returns {Buffer} a producers section
 */
const producersSection = (payload) => {
	const content = Buffer.concat([name("producers"), payload]);
	return Buffer.concat([Buffer.from([0x00, content.length]), content]);
};

/**
 * @param {Buffer} binary a module
 * @returns {Buffer | undefined} the content of its producers section
 */
const findProducers = (binary) => {
	let offset = HEADER.length;
	while (offset < binary.length) {
		const id = binary[offset];
		const size = binary[offset + 1];
		const content = binary.subarray(offset + 2, offset + 2 + size);
		if (id === 0 && content.subarray(1, 10).toString() === "producers") {
			return content.subarray(10);
		}
		offset += 2 + size;
	}
	return undefined;
};

describe("ProducersSection", () => {
	it("should add the section to a module without one", () => {
		const binary = Buffer.concat([HEADER, TYPE_SECTION]);
		const result = addProcessedBy(binary, "webpack", "5.0.0");
		expect(result.subarray(0, binary.length)).toEqual(binary);
		expect(
			decodeProducers(/** @type {Buffer} */ (findProducers(result)))
		).toEqual(new Map([["processed-by", new Map([["webpack", "5.0.0"]])]]));
	});

	it("should keep other fields and tools, in the conventional order", () => {
		const existing = producersSection(
			Buffer.concat([
				Buffer.from([2]),
				name("sdk"),
				Buffer.from([1]),
				name("Emscripten"),
				name("3.1"),
				name("processed-by"),
				Buffer.from([2]),
				name("clang"),
				name("16"),
				name("webpack"),
				name("4.0.0")
			])
		);
		const result = addProcessedBy(
			Buffer.concat([HEADER, existing, TYPE_SECTION]),
			"webpack",
			"5.0.0"
		);
		const fields = decodeProducers(
			/** @type {Buffer} */ (findProducers(result))
		);
		expect([...fields.keys()]).toEqual(["processed-by", "sdk"]);
		expect(fields.get("processed-by")).toEqual(
			new Map([
				["clang", "16"],
				["webpack", "5.0.0"]
			])
		);
		// the old section is dropped, not duplicated
		expect(result.indexOf("Emscripten")).toBe(result.lastIndexOf("Emscripten"));
	});

	it("should handle a section size that needs a multi-byte LEB128", () => {
		const version = "9".repeat(200);
		const result = addProcessedBy(
			Buffer.concat([HEADER, TYPE_SECTION]),
			"webpack",
			version
		);
		expect(result.toString("latin1")).toContain(version);
	});

	it("should return the module untouched when it cannot be read", () => {
		const truncated = Buffer.concat([HEADER, Buffer.from([0x01, 0x7f, 0x00])]);
		expect(addProcessedBy(truncated, "webpack", "5.0.0")).toBe(truncated);
		const unterminated = Buffer.concat([HEADER, Buffer.from([0x01, 0x80])]);
		expect(addProcessedBy(unterminated, "webpack", "5.0.0")).toBe(unterminated);
		const brokenProducers = Buffer.concat([
			HEADER,
			producersSection(Buffer.from([0x05]))
		]);
		expect(addProcessedBy(brokenProducers, "webpack", "5.0.0")).toBe(
			brokenProducers
		);
		const trailing = Buffer.concat([
			HEADER,
			producersSection(Buffer.from([0x00, 0x00]))
		]);
		expect(addProcessedBy(trailing, "webpack", "5.0.0")).toBe(trailing);
	});
});
