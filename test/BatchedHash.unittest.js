"use strict";

const createHash = require("../lib/util/createHash");
const BatchedHash = require("../lib/util/hash/BatchedHash");

/**
 * @returns {import("../lib/util/Hash")} a fresh underlying hash
 */
const raw = () => createHash("xxhash64");

describe("BatchedHash", () => {
	it("should produce the same digest as the wrapped hash for batched strings", () => {
		const reference = raw();
		reference.update("hello");
		reference.update("world");
		const batched = new BatchedHash(raw());
		batched.update("hello");
		batched.update("world");
		expect(batched.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should flush a buffered encoded string before a buffer update", () => {
		const reference = raw();
		reference.update("ab", "latin1");
		reference.update(Buffer.from("cd"));
		const batched = new BatchedHash(raw());
		batched.update("ab", "latin1");
		batched.update(Buffer.from("cd"));
		expect(batched.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should pass base64 input straight through instead of batching it", () => {
		const reference = raw();
		reference.update("aGVsbG8=", "base64");
		const batched = new BatchedHash(raw());
		batched.update("aGVsbG8=", "base64");
		expect(batched.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should match for a long string that exceeds the batch limit", () => {
		// longer than MAX_SHORT_STRING so it is hashed directly, not buffered
		const long = "x".repeat(20000);
		const reference = raw();
		reference.update(long);
		const batched = new BatchedHash(raw());
		batched.update(long);
		expect(batched.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should flush a buffered encoded string at digest time", () => {
		const reference = raw();
		reference.update("ab", "latin1");
		const batched = new BatchedHash(raw());
		batched.update("ab", "latin1");
		expect(batched.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should return a Buffer digest when no encoding is given", () => {
		const reference = raw();
		reference.update("data");
		const batched = new BatchedHash(raw());
		batched.update("data");
		expect(batched.digest()).toEqual(reference.digest());
	});
});
