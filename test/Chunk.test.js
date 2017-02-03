"use strict";

const should = require("should");
const path = require("path");
const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(() => ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test"));

	it("should have debugId more than 100", () => should(ChunkInstance.debugId).be.above(100));

	it("returns a string with modules information", () => should(ChunkInstance.toString()).be.exactly("Chunk[]"));

	it("should have origins based in constructor information", () =>
		should(ChunkInstance.origins[0]).be.eql({
			module: "module-test",
			loc: "loc-test",
			name: "chunk-test"
		}));

	it("should not be the initial instance", () => should(ChunkInstance.isInitial()).be.false());

	describe("entry", () => {
		it("returns an error if get entry", () =>
			should(() => {
				const entryTest = ChunkInstance.entry;
			}).throw("Chunk.entry was removed. Use hasRuntime()"));

		it("returns an error if set an entry", () =>
			should(() => {
				ChunkInstance.entry = 10;
			}).throw("Chunk.entry was removed. Use hasRuntime()"));
	});

	describe("initial", () => {
		it("returns an error if get initial", () =>
			should(() => {
				const initialTest = ChunkInstance.initial;
			}).throw("Chunk.initial was removed. Use isInitial()"));

		it("returns an error if set an initial", () =>
			should(() => {
				ChunkInstance.initial = 10;
			}).throw("Chunk.initial was removed. Use isInitial()"));
	});

	describe("hasRuntime", () => {
		it("returns false", () => should(ChunkInstance.hasRuntime()).be.false());
	});

	describe("isEmpty", () => {
		it("should NOT have any module by default", () => should(ChunkInstance.isEmpty()).be.true());
	});

	describe("size", () => {
		it("should NOT have any module by default", () =>
			should(ChunkInstance.size({
				chunkOverhead: 10,
				entryChunkMultiplicator: 2
			})).be.exactly(10));
	});

	describe("checkConstraints", () => {
		it("throws an error", () =>
			should(() => {
				ChunkInstance.checkConstraints();
			}).not.throw(/checkConstraints/));
	});

	describe("canBeIntegrated", () => {
		it("returns `false` if other object is initial", () => {
			const other = {
				isInitial: () => true
			};
			should(ChunkInstance.canBeIntegrated(other)).be.false();
		});

		it("returns `true` if other object and chunk instance are NOT initial", () => {
			const other = {
				isInitial: () => false
			};
			should(ChunkInstance.canBeIntegrated(other)).be.true();
		});
	});
});
