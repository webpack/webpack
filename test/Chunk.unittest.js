/* globals describe, it, beforeEach */
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

	it("returns a string with modules information", () => {
		expect(ChunkInstance.toString()).toBe("Chunk[]");
	});

	it("should not be the initial instance", () => {
		expect(ChunkInstance.canBeInitial()).toBe(false);
	});

	describe("entry", () => {
		it("returns an error if get entry", () => {
			expect(() => {
				ChunkInstance.entry;
			}).toThrow("Chunk.entry was removed. Use hasRuntime()");
		});

		it("returns an error if set an entry", () => {
			expect(() => {
				ChunkInstance.entry = 10;
			}).toThrow("Chunk.entry was removed. Use hasRuntime()");
		});
	});

	describe("initial", () => {
		it("returns an error if get initial", () => {
			expect(() => {
				ChunkInstance.initial;
			}).toThrow("Chunk.initial was removed. Use canBeInitial/isOnlyInitial()");
		});

		it("returns an error if set an initial", () => {
			expect(() => {
				ChunkInstance.initial = 10;
			}).toThrow("Chunk.initial was removed. Use canBeInitial/isOnlyInitial()");
		});
	});

	describe("hasRuntime", () => {
		it("returns false", () => {
			expect(ChunkInstance.hasRuntime()).toBe(false);
		});
	});

	describe("isEmpty", () => {
		it("should NOT have any module by default", () => {
			expect(ChunkInstance.isEmpty()).toBe(true);
		});
	});

	describe("size", () => {
		it("should NOT have any module by default", () => {
			expect(
				ChunkInstance.size({
					chunkOverhead: 10,
					entryChunkMultiplicator: 2
				})
			).toBe(10);
		});
	});

	describe("removeModule", () => {
		let module;
		let removeChunkSpy;

		beforeEach(() => {
			removeChunkSpy = jest.fn();
			module = {
				removeChunk: removeChunkSpy
			};
		});

		describe("and the chunk does not contain this module", () => {
			it("returns false", () => {
				expect(ChunkInstance.removeModule(module)).toBe(false);
			});
		});

		describe("and the chunk does contain this module", () => {
			beforeEach(() => {
				ChunkInstance._modules = new Set([module]);
			});

			it("calls module.removeChunk with itself and returns true", () => {
				expect(ChunkInstance.removeModule(module)).toBe(true);

				expect(removeChunkSpy.mock.calls.length).toBe(1);
				expect(removeChunkSpy.mock.calls[0][0]).toBe(ChunkInstance);
			});
		});

		describe("getNumberOfGroups", () => {
			beforeEach(() => {
				ChunkInstance._groups = new Set();
			});

			it("should return the number of chunk groups contained by the chunk", () => {
				expect(ChunkInstance.getNumberOfGroups()).toBe(0);
			});
		});
	});
});
