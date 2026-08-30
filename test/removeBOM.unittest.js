"use strict";

// cspell:disable -- VLQ-encoded source-map mappings strings below
const {
	adjustSourceMapForRemovedBOM,
	removeBOM,
	removeBOMFromResult
} = require("../lib/util/removeBOM");

const BOM = "\uFEFF";
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/**
 * @param {string} mappings mappings
 * @returns {import("webpack-sources").RawSourceMap} a source map carrying them
 */
const map = (mappings) => ({
	version: 3,
	file: "x.js",
	sources: ["x.js"],
	names: [],
	mappings
});

describe("removeBOM", () => {
	it("removes a BOM from a string", () => {
		expect(removeBOM(`${BOM}a`)).toBe("a");
	});

	it("removes a UTF-8 BOM from a buffer", () => {
		expect(removeBOM(Buffer.concat([UTF8_BOM, Buffer.from("a")]))).toEqual(
			Buffer.from("a")
		);
	});

	it("returns content without a BOM as it is", () => {
		const buffer = Buffer.from("a");

		expect(removeBOM("a")).toBe("a");
		expect(removeBOM(buffer)).toBe(buffer);
	});
});

describe("adjustSourceMapForRemovedBOM", () => {
	it("shifts the first line of a map that counted the BOM", () => {
		expect(adjustSourceMapForRemovedBOM(map("CAAA;AACA"))).toEqual(
			map("AAAA;AACA")
		);
	});

	it("shifts only the first segment, leaving the ones after it relative to it", () => {
		expect(adjustSourceMapForRemovedBOM(map("gBAAgB,eAAe"))).toEqual(
			map("eAAgB,eAAe")
		);
	});

	it("leaves a map that already starts at column 0 alone", () => {
		const sourceMap = map("AAAA;AACA");

		expect(adjustSourceMapForRemovedBOM(sourceMap)).toBe(sourceMap);
	});

	// Column 0 of a BOM-prefixed line is the BOM, never source content, so a map
	// that skipped it anyway did not describe its own content.
	it("shifts a map that skipped the first column for a reason of its own", () => {
		expect(adjustSourceMapForRemovedBOM(map("EAAA"))).toEqual(map("CAAA"));
	});

	it("leaves a map declaring a version other than 3 alone, and shifts one declaring none", () => {
		const older = { ...map("CAAA"), version: 2 };
		const versionless = { mappings: "CAAA", sources: ["x.js"] };

		expect(
			adjustSourceMapForRemovedBOM(
				/** @type {import("webpack-sources").RawSourceMap} */
				(/** @type {unknown} */ (older))
			)
		).toBe(older);
		expect(
			adjustSourceMapForRemovedBOM(
				/** @type {import("webpack-sources").RawSourceMap} */
				(/** @type {unknown} */ (versionless))
			)
		).toEqual({ mappings: "AAAA", sources: ["x.js"] });
	});

	it("leaves a map whose first line has no mapping alone", () => {
		const sourceMap = map(";CAAA");

		expect(adjustSourceMapForRemovedBOM(sourceMap)).toBe(sourceMap);
	});

	it("adjusts a map handed over as JSON", () => {
		expect(adjustSourceMapForRemovedBOM(JSON.stringify(map("CAAA")))).toBe(
			JSON.stringify(map("AAAA"))
		);
	});

	it("leaves anything that is not a map with mappings alone", () => {
		const notJson = "/some/source.js";
		const withoutMappings = { version: 3, sources: [] };

		expect(adjustSourceMapForRemovedBOM(undefined)).toBeUndefined();
		expect(adjustSourceMapForRemovedBOM(notJson)).toBe(notJson);
		expect(adjustSourceMapForRemovedBOM(JSON.stringify(map("AAAA")))).toBe(
			JSON.stringify(map("AAAA"))
		);
		expect(
			adjustSourceMapForRemovedBOM(
				/** @type {import("webpack-sources").RawSourceMap} */
				(/** @type {unknown} */ (withoutMappings))
			)
		).toBe(withoutMappings);
	});
});

describe("removeBOMFromResult", () => {
	it("removes the BOM and adjusts the source map", () => {
		expect(
			removeBOMFromResult([`${BOM}const a = 1;`, map("CAAA"), undefined])
		).toEqual(["const a = 1;", map("AAAA"), undefined]);
	});

	it("keeps the arity of a result carrying no source map", () => {
		const result = removeBOMFromResult(
			/** @type {import("../lib/NormalModule").Result} */
			(/** @type {unknown} */ ([`${BOM}const a = 1;`]))
		);

		expect(result).toEqual(["const a = 1;"]);
		expect(result).toHaveLength(1);
	});

	it("returns a result without a BOM as it is", () => {
		/** @type {import("../lib/NormalModule").Result} */
		const result = ["const a = 1;", map("CAAA"), undefined];

		expect(removeBOMFromResult(result)).toBe(result);
	});
});
// cspell:enable
