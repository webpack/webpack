/* globals describe, it, beforeEach */
"use strict";

const sinon = require("sinon");
const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(() => ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test"));

	it("should have debugId more than 999", () => expect(ChunkInstance.debugId).toBeGreaterThan(999));

	it("returns a string with modules information", () => expect(ChunkInstance.toString()).toBe("Chunk[]"));

	it("should have origins based in constructor information", () =>
		expect(ChunkInstance.origins[0]).toEqual({
			module: "module-test",
			loc: "loc-test",
			name: "chunk-test"
		}));

	it("should not be the initial instance", () => expect(ChunkInstance.isInitial()).toBeFalsy());

	describe("entry", () => {
		it("returns an error if get entry", () =>
			expect(() => {
				ChunkInstance.entry;
			}).toThrow("Chunk.entry was removed. Use hasRuntime()"));

		it("returns an error if set an entry", () =>
			expect(() => {
				ChunkInstance.entry = 10;
			}).toThrow("Chunk.entry was removed. Use hasRuntime()"));
	});

	describe("initial", () => {
		it("returns an error if get initial", () =>
			expect(() => {
				ChunkInstance.initial;
			}).toThrow("Chunk.initial was removed. Use isInitial()"));

		it("returns an error if set an initial", () =>
			expect(() => {
				ChunkInstance.initial = 10;
			}).toThrow("Chunk.initial was removed. Use isInitial()"));
	});

	describe("hasRuntime", () => {
		it("returns false", () => expect(ChunkInstance.hasRuntime()).toBeFalsy());
	});

	describe("isEmpty", () => {
		it("should NOT have any module by default", () => expect(ChunkInstance.isEmpty()).toBeTruthy());
	});

	describe("size", () => {
		it("should NOT have any module by default", () =>
			expect(ChunkInstance.size({
				chunkOverhead: 10,
				entryChunkMultiplicator: 2
			})).toBe(10));
	});

	describe("checkConstraints", () => {
		it("throws an error", () =>
			expect(() => {
				ChunkInstance.checkConstraints();
			}).not.toThrow(/checkConstraints/));
	});

	describe("canBeIntegrated", () => {
		it("returns `false` if other object is initial", () => {
			const other = {
				isInitial: () => true
			};
			expect(ChunkInstance.canBeIntegrated(other)).toBeFalsy();
		});

		it("returns `true` if other object and chunk instance are NOT initial", () => {
			const other = {
				isInitial: () => false
			};
			expect(ChunkInstance.canBeIntegrated(other)).toBeTruthy();
		});
	});

	describe("removeModule", function() {
		let module;
		let removeChunkSpy;
		beforeEach(function() {
			removeChunkSpy = sinon.spy();
			module = {
				removeChunk: removeChunkSpy
			};
		});
		describe("and the chunk does not contain this module", function() {
			it("returns false", function() {
				expect(ChunkInstance.removeModule(module)).toEqual(false);
			});
		});
		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance.modules = [module];
			});
			it("calls module.removeChunk with itself and returns true", function() {
				expect(ChunkInstance.removeModule(module)).toEqual(true);
				expect(removeChunkSpy.callCount).toEqual(1);
				expect(removeChunkSpy.args[0][0]).toEqual(ChunkInstance);
			});
		});
	});

	describe("removeChunk", function() {
		let chunk;
		let removeParentSpy;
		beforeEach(function() {
			removeParentSpy = sinon.spy();
			chunk = {
				removeParent: removeParentSpy
			};
		});
		describe("and the chunk does not contain this chunk", function() {
			it("returns false", function() {
				expect(ChunkInstance.removeChunk(chunk)).toEqual(false);
			});
		});
		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance.chunks = [chunk];
			});
			it("calls module.removeChunk with itself and returns true", function() {
				expect(ChunkInstance.removeChunk(chunk)).toEqual(true);
				expect(removeParentSpy.callCount).toEqual(1);
				expect(removeParentSpy.args[0][0]).toEqual(ChunkInstance);
			});
		});
	});

	describe("removeParent", function() {
		let chunk;
		let removeChunkSpy;
		beforeEach(function() {
			removeChunkSpy = sinon.spy();
			chunk = {
				removeChunk: removeChunkSpy
			};
		});
		describe("and the chunk does not contain this chunk", function() {
			it("returns false", function() {
				expect(ChunkInstance.removeParent(chunk)).toEqual(false);
			});
		});
		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance.parents = [chunk];
			});
			it("calls module.removeChunk with itself and returns true", function() {
				expect(ChunkInstance.removeParent(chunk)).toEqual(true);
				expect(removeChunkSpy.callCount).toEqual(1);
				expect(removeChunkSpy.args[0][0]).toEqual(ChunkInstance);
			});
		});
	});
});
