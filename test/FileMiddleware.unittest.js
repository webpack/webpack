"use strict";

const FileMiddleware = require("../lib/serialization/FileMiddleware");

// Internal `deserialize(middleware, name, readFile)` exposed for this test.
const deserialize = FileMiddleware._deserialize;

// Matches VERSION in lib/serialization/FileMiddleware.js.
const VERSION = 0x01637077;

/**
 * @param {number[]} sectionLengths positive content section lengths
 * @returns {Buffer} the pack header (version, section count, section lengths)
 */
const buildHeader = (sectionLengths) => {
	const header = Buffer.allocUnsafe(8 + sectionLengths.length * 4);
	header.writeUInt32LE(VERSION, 0);
	header.writeUInt32LE(sectionLengths.length, 4);
	for (const [i, len] of sectionLengths.entries()) {
		header.writeInt32LE(len, 8 + i * 4);
	}
	return header;
};

describe("FileMiddleware deserialize", () => {
	it("reads content that starts exactly at a content-buffer boundary", async () => {
		const content = Buffer.from([1, 2, 3, 4, 5]);
		const header = buildHeader([content.length]);
		// `readFile` returns multiple buffers (as it does for large caches read in
		// chunks). The header fills the first buffer exactly, so the content run
		// begins on a content-buffer boundary — the case that regressed.
		const readFile = () => Promise.resolve([header, content]);

		const result = await deserialize(
			/** @type {InstanceType<typeof FileMiddleware>} */ (
				/** @type {unknown} */ (null)
			),
			"test",
			readFile
		);

		expect(result).toHaveLength(1);
		expect(Buffer.from(/** @type {Buffer} */ (result[0]))).toEqual(content);
	});
});
