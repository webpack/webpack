/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const sinon = require("sinon");
const Chunk = require("../lib/Chunk");

describe("Chunk", () => {
	let ChunkInstance;

	beforeEach(() => ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test"));

	it("should have debugId more than 999", () => should(ChunkInstance.debugId).be.above(999));

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
				ChunkInstance.removeChunk(chunk).should.eql(false);
			});
		});
		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance.chunks = [chunk];
			});
			it("calls module.removeChunk with itself and returns true", function() {
				ChunkInstance.removeChunk(chunk).should.eql(true);
				removeParentSpy.callCount.should.eql(1);
				removeParentSpy.args[0][0].should.eql(ChunkInstance);
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
				ChunkInstance.removeParent(chunk).should.eql(false);
			});
		});
		describe("and the chunk does contain this module", function() {
			beforeEach(function() {
				ChunkInstance.parents = [chunk];
			});
			it("calls module.removeChunk with itself and returns true", function() {
				ChunkInstance.removeParent(chunk).should.eql(true);
				removeChunkSpy.callCount.should.eql(1);
				removeChunkSpy.args[0][0].should.eql(ChunkInstance);
			});
		});
	});
});
