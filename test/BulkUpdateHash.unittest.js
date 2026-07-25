"use strict";

const createHash = require("../lib/util/createHash");
const BulkUpdateHash = require("../lib/util/hash/BulkUpdateHash");

/**
 * @returns {import("../lib/util/Hash")} a fresh underlying hash
 */
const raw = () => createHash("xxhash64");

describe("BulkUpdateHash", () => {
	it("should match the wrapped hash when built from small buffered chunks", () => {
		const reference = raw();
		reference.update("abcdefgh");
		const bulk = new BulkUpdateHash(() => raw());
		bulk.update("ab");
		bulk.update("cd");
		bulk.update("ef");
		bulk.update("gh");
		expect(bulk.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should accept a hash instance directly", () => {
		const reference = raw();
		reference.update("data");
		const bulk = new BulkUpdateHash(raw());
		bulk.update("data");
		expect(bulk.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should flush the buffer when an encoded or buffer update arrives", () => {
		const reference = raw();
		reference.update("ab");
		reference.update("XY", "latin1");
		reference.update(Buffer.from("Z"));
		const bulk = new BulkUpdateHash(() => raw());
		bulk.update("ab");
		bulk.update("XY", "latin1");
		bulk.update(Buffer.from("Z"));
		expect(bulk.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should flush when the buffer grows past the bulk size", () => {
		const reference = raw();
		reference.update("abcdef");
		const bulk = new BulkUpdateHash(() => raw());
		bulk.update("abc");
		bulk.update("def");
		expect(bulk.digest("hex")).toBe(reference.digest("hex"));
	});

	it("should cache digests when a hash key is provided", () => {
		const reference = raw();
		reference.update("ab");
		const first = new BulkUpdateHash(() => raw(), "bulk-test-key");
		first.update("ab");
		const cached = first.digest("hex");
		expect(cached).toBe(reference.digest("hex"));
		// a second instance with the same key and buffer hits the digest cache
		const second = new BulkUpdateHash(() => raw(), "bulk-test-key");
		second.update("ab");
		expect(second.digest("hex")).toBe(cached);
	});

	it("should return a Buffer digest when no encoding is given", () => {
		const reference = raw();
		reference.update("ab");
		const bulk = new BulkUpdateHash(() => raw(), "bulk-buffer-key");
		bulk.update("ab");
		expect(bulk.digest()).toEqual(reference.digest());
	});

	it("should return a Buffer digest after the hash was already realized", () => {
		const reference = raw();
		reference.update("abcdef");
		// this flushes and realizes the hash, so digest() skips the cache path
		const bulk = new BulkUpdateHash(() => raw());
		bulk.update("abc");
		bulk.update("def");
		expect(bulk.digest()).toEqual(reference.digest());
	});
});
