"use strict";

const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(() => {
		ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test");
	});

	it("should have debugId more than 999", () => {
		expect(ChunkInstance.debugId).toBeGreaterThan(999);
	});

	it("should not be the initial instance", () => {
		expect(ChunkInstance.canBeInitial()).toBe(false);
	});

	describe("hasRuntime", () => {
		it("returns false", () => {
			expect(ChunkInstance.hasRuntime()).toBe(false);
		});
	});
});
