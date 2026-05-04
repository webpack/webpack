"use strict";

// cspell:disable -- VLQ-encoded source-map mappings strings below
const { encodeMappings, encodeVLQ } = require("../lib/util/createMappings");

describe("encodeVLQ", () => {
	const cases = [
		[0, "A"],
		[1, "C"],
		[-1, "D"],
		[15, "e"],
		[16, "gB"],
		[-16, "hB"],
		[123456, "gkxH"]
	];

	for (const [input, expected] of cases) {
		it(`encodes ${input} -> ${expected}`, () => {
			expect(encodeVLQ(input)).toBe(expected);
		});
	}
});

describe("encodeMappings", () => {
	it("returns the empty string for an empty input", () => {
		expect(encodeMappings([])).toBe("");
	});

	it("emits a single semicolon per skipped line", () => {
		expect(encodeMappings([null, null, null])).toBe(";;");
	});

	it("encodes a single segment per line", () => {
		const result = encodeMappings([
			null,
			{
				generatedColumn: 0,
				sourceIndex: 0,
				originalLine: 0,
				originalColumn: 0
			},
			null,
			{
				generatedColumn: 0,
				sourceIndex: 0,
				originalLine: 4,
				originalColumn: 0
			}
		]);
		expect(result).toBe(";AAAA;;AAIA");
	});

	it("emits relative deltas across lines", () => {
		const result = encodeMappings([
			{ sourceIndex: 0, originalLine: 0, originalColumn: 0 },
			{ sourceIndex: 0, originalLine: 1, originalColumn: 0 },
			{ sourceIndex: 0, originalLine: 5, originalColumn: 2 }
		]);
		expect(result).toBe("AAAA;AACA;AAIE");
	});

	it("supports multiple segments on the same line", () => {
		const result = encodeMappings([
			[
				{
					generatedColumn: 0,
					sourceIndex: 0,
					originalLine: 0,
					originalColumn: 0
				},
				{
					generatedColumn: 4,
					sourceIndex: 0,
					originalLine: 0,
					originalColumn: 4
				}
			]
		]);
		expect(result).toBe("AAAA,IAAI");
	});

	it("supports an unmapped generated-only segment", () => {
		const result = encodeMappings([
			[{ generatedColumn: 0 }, { generatedColumn: 8 }]
		]);
		expect(result).toBe("A,Q");
	});

	it("supports a name index", () => {
		const result = encodeMappings([
			{
				generatedColumn: 0,
				sourceIndex: 0,
				originalLine: 0,
				originalColumn: 0,
				nameIndex: 0
			},
			{
				generatedColumn: 0,
				sourceIndex: 0,
				originalLine: 1,
				originalColumn: 0,
				nameIndex: 1
			}
		]);
		expect(result).toBe("AAAAA;AACAC");
	});
});
// cspell:enable
