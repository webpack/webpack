"use strict";

const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	/** @type {InstanceType<typeof Chunk>} */
	let ChunkInstance;

	beforeEach(() => {
		const ChunkAny =
			/** @type {new (...args: unknown[]) => InstanceType<typeof Chunk>} */ (
				/** @type {unknown} */ (Chunk)
			);
		ChunkInstance = new ChunkAny("chunk-test", "module-test", "loc-test");
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
