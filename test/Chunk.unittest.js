/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const sinon = require("sinon");
const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(
		() => (ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test"))
	);

	it("should have debugId more than 999", () =>
		should(ChunkInstance.debugId).be.above(999));

	it("returns a string with modules information", () =>
		should(ChunkInstance.toString()).be.exactly("Chunk[]"));

	it("should not be the initial instance", () =>
		should(ChunkInstance.canBeInitial()).be.false());

	describe("entry", () => {
		it("returns an error if get entry", () =>
			should(() => {
				ChunkInstance.entry;
			}).throw("Chunk.entry was removed. Use hasRuntime()"));

		it("returns an error if set an entry", () =>
			should(() => {
				ChunkInstance.entry = 10;
			}).throw("Chunk.entry was removed. Use hasRuntime()"));
	});

	describe("initial", () => {
		it("returns an error if get initial", () =>
			should(() => {
				ChunkInstance.initial;
			}).throw("Chunk.initial was removed. Use canBeInitial/isOnlyInitial()"));

		it("returns an error if set an initial", () =>
			should(() => {
				ChunkInstance.initial = 10;
			}).throw("Chunk.initial was removed. Use canBeInitial/isOnlyInitial()"));
	});

	describe("hasRuntime", () => {
		it("returns false", () => should(ChunkInstance.hasRuntime()).be.false());
	});

	describe("isEmpty", () => {
		it("should NOT have any module by default", () =>
			should(ChunkInstance.isEmpty()).be.true());
	});

	describe("size", () => {
		it("should NOT have any module by default", () =>
			should(
				ChunkInstance.size({
					chunkOverhead: 10,
					entryChunkMultiplicator: 2
				})
			).be.exactly(10));
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
				ChunkInstance.removeModule(module).should.eql(false);
			});
		});

		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance._modules = new Set([module]);
			});

			it("calls module.removeChunk with itself and returns true", function() {
				ChunkInstance.removeModule(module).should.eql(true);

				removeChunkSpy.callCount.should.eql(1);
				removeChunkSpy.args[0][0].should.eql(ChunkInstance);
			});
		});

		describe("getNumberOfGroups", function() {
			beforeEach(function() {
				ChunkInstance._groups = new Set();
			});

			it("should return the number of chunk groups contained by the chunk", function() {
				ChunkInstance.getNumberOfGroups().should.eql(0);
			});
		});
	});
});
