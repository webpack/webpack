"use strict";

const {
	PUBLIC_PATH_FULL_HASH,
	walkFullHashPlaceholders
} = require("../lib/util/publicPathPlaceholder");

/**
 * @param {string} content text to scan
 * @returns {[number, number, number][]} matched [start, end, length] tuples
 */
const collect = (content) => {
	/** @type {[number, number, number][]} */
	const matches = [];
	walkFullHashPlaceholders(content, (start, end, length) =>
		matches.push([start, end, length])
	);
	return matches;
};

describe("publicPathPlaceholder.walkFullHashPlaceholders", () => {
	it("should match a well-formed placeholder and decode its length", () => {
		expect(collect(`${PUBLIC_PATH_FULL_HASH}8__`)).toEqual([
			[0, PUBLIC_PATH_FULL_HASH.length + 3, 8]
		]);
	});

	it("should treat a zero length as the full hash", () => {
		expect(collect(`${PUBLIC_PATH_FULL_HASH}0__`)).toEqual([
			[0, PUBLIC_PATH_FULL_HASH.length + 3, 0]
		]);
	});

	it("should match several placeholders in one string", () => {
		const one = `${PUBLIC_PATH_FULL_HASH}4__`;
		const two = `${PUBLIC_PATH_FULL_HASH}12__`;
		expect(collect(`${one}x${two}`).map((m) => m[2])).toEqual([4, 12]);
	});

	it("should skip a prefix with no digits", () => {
		expect(collect(`${PUBLIC_PATH_FULL_HASH}x`)).toEqual([]);
	});

	it("should skip a prefix whose digits are not followed by __", () => {
		expect(collect(`${PUBLIC_PATH_FULL_HASH}8x`)).toEqual([]);
	});

	it("should return nothing when there is no placeholder", () => {
		expect(collect("no placeholder here")).toEqual([]);
	});
});
