"use strict";

const { decode, encode } = require("../lib/util/hash/hash-digest");

/** @type {import("../lib/util/hash/hash-digest").Base[]} */
const BASES = ["26", "32", "36", "49", "52", "58", "62"];

describe("hash-digest base-N", () => {
	const samples = [
		"",
		"00",
		"000000",
		"01",
		"abcdef",
		"0000abcdef",
		"00000001",
		"0000ffff",
		"ffffffffffffffff",
		"fec455e8e47a6923",
		"00000000000000000001"
	];

	for (const base of BASES) {
		for (const hex of samples) {
			it(`round-trips ${hex || "(empty)"} in base${base}`, () => {
				const buf = Buffer.from(hex, "hex");
				expect(decode(encode(buf, base), base).toString("hex")).toBe(hex);
			});
		}
	}

	it("preserves leading zero bytes (no collapse / collision)", () => {
		// each leading 0x00 byte becomes one leading alphabet[0] char
		expect(encode(Buffer.from("0000abcdef", "hex"), "58")).toBe("11zi2A");
		expect(encode(Buffer.from("abcdef", "hex"), "58")).toBe("zi2A");
		// all-zero input keeps its byte length
		expect(encode(Buffer.from("000000", "hex"), "62")).toBe("000");
	});

	it("keeps a sliced length meaningful for zero-heavy digests", () => {
		const enc = encode(Buffer.from("00000000000000000001", "hex"), "62");
		expect(enc).toBe("0000000001");
		expect(enc.slice(0, 8)).toHaveLength(8);
	});
});
