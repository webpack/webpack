"use strict";

const nonNumericOnlyHash = require("../lib/util/nonNumericOnlyHash");
const { digestNonNumericOnly } = require("../lib/util/nonNumericOnlyHash");

describe("nonNumericOnlyHash", () => {
	it("hashLength=0", () => {
		expect(nonNumericOnlyHash("111", 0)).toBe("");
	});

	it("abc", () => {
		expect(nonNumericOnlyHash("abc", 10)).toBe("abc");
	});

	it("abc1", () => {
		expect(nonNumericOnlyHash("abc1", 3)).toBe("abc");
	});

	it("ab11", () => {
		expect(nonNumericOnlyHash("ab11", 3)).toBe("ab1");
	});

	it("0111", () => {
		expect(nonNumericOnlyHash("0111", 3)).toBe("a11");
	});

	it("911a", () => {
		expect(nonNumericOnlyHash("911a", 3)).toBe("d11");
	});

	it("511a", () => {
		expect(nonNumericOnlyHash("511a", 3)).toBe("f11");
	});
});

describe("nonNumericOnlyHash.digestNonNumericOnly", () => {
	const fakeHash = (/** @type {string} */ value) =>
		/** @type {EXPECTED_ANY} */ ({
			digest: (/** @type {string} */ encoding) => `${value}:${encoding}`
		});

	it("digests then truncates with a non-numeric first char", () => {
		expect(digestNonNumericOnly(fakeHash("abcdef"), "hex", 3)).toBe("abc");
		// digit-only slice gets its first char shifted (same as nonNumericOnlyHash)
		expect(digestNonNumericOnly(fakeHash("0111"), "hex", 3)).toBe(
			nonNumericOnlyHash("0111:hex", 3)
		);
	});
});
