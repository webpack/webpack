"use strict";

const StringXor = require("../lib/util/StringXor");

/** @typedef {import("../lib/util/Hash")} Hash */

/**
 * @param {StringXor} xor xor accumulator
 * @returns {number[]} the raw byte values of the current state
 */
const bytes = (xor) => [...Buffer.from(xor.toString(), "latin1")];

describe("StringXor", () => {
	it("should be an empty string before anything is added", () => {
		expect(new StringXor().toString()).toBe("");
	});

	it("should copy the first added string verbatim", () => {
		const xor = new StringXor();
		xor.add("hello");
		expect(xor.toString()).toBe("hello");
	});

	it("should xor to zero bytes when the same string is added twice", () => {
		const xor = new StringXor();
		xor.add("hello");
		xor.add("hello");
		expect(bytes(xor)).toEqual([0, 0, 0, 0, 0]);
	});

	it("should grow the buffer when a longer string arrives", () => {
		const xor = new StringXor();
		xor.add("ab");
		xor.add("abc");
		expect(bytes(xor)).toEqual([0, 0, "c".charCodeAt(0)]);
	});

	it("should keep the buffer length when a shorter string arrives", () => {
		const xor = new StringXor();
		xor.add("abc");
		xor.add("a");
		expect(bytes(xor)).toEqual([0, "b".charCodeAt(0), "c".charCodeAt(0)]);
	});

	it("should be order-independent", () => {
		const a = new StringXor();
		a.add("foo");
		a.add("bar");
		const b = new StringXor();
		b.add("bar");
		b.add("foo");
		expect(a.toString()).toBe(b.toString());
	});

	describe("updateHash", () => {
		it("should feed the buffered value into the hash", () => {
			const xor = new StringXor();
			xor.add("hello");
			const update = jest.fn();
			const hash = /** @type {Hash} */ (/** @type {unknown} */ ({ update }));
			xor.updateHash(hash);
			expect(update).toHaveBeenCalledTimes(1);
			expect(update.mock.calls[0][0].toString("latin1")).toBe("hello");
		});

		it("should do nothing when no string was added", () => {
			const xor = new StringXor();
			const update = jest.fn();
			const hash = /** @type {Hash} */ (/** @type {unknown} */ ({ update }));
			xor.updateHash(hash);
			expect(update).not.toHaveBeenCalled();
		});
	});
});
