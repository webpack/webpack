var should = require("should");
var path = require("path");
var Chunk = require("../lib/Chunk");

describe("Chunk", function() {
	var ChunkInstance;

	beforeEach(function() {
		ChunkInstance = new Chunk("chunk-test", "module-test", "loc-test");
	});

	it("should have debugId more than 100", function() {
		should(ChunkInstance.debugId).be.above(100);
	});

	it("returns a string with modules information", function() {
		should(ChunkInstance.toString()).be.exactly("Chunk[]");
	})

	it("should have origins based in constructor information", function() {
		should(ChunkInstance.origins[0]).be.eql({
			module: "module-test",
			loc: "loc-test",
			name: "chunk-test"
		})
	});

	it("should not be the initial instance", function() {
		should(ChunkInstance.isInitial()).be.false();
	});

	describe("entry", function() {
		it("returns an error if get entry", function() {
			should(function() {
				var entryTest = ChunkInstance.entry;
			}).throw("Chunk.entry was removed. Use hasRuntime()");
		});

		it("returns an error if set an entry", function() {
			should(function() {
				ChunkInstance.entry = 10;
			}).throw("Chunk.entry was removed. Use hasRuntime()");
		});
	});

	describe("initial", function() {
		it("returns an error if get initial", function() {
			should(function() {
				var initialTest = ChunkInstance.initial;
			}).throw("Chunk.initial was removed. Use isInitial()");
		});

		it("returns an error if set an initial", function() {
			should(function() {
				ChunkInstance.initial = 10;
			}).throw("Chunk.initial was removed. Use isInitial()");
		});
	});

	describe("hasRuntime", function() {
		it("returns false", function() {
			should(ChunkInstance.hasRuntime()).be.false();
		});
	});

	describe("isEmpty", function() {
		it("should NOT have any module by default", function() {
			should(ChunkInstance.isEmpty()).be.true();
		});
	});

	describe("size", function() {
		it("should NOT have any module by default", function() {
			should(ChunkInstance.size({
				chunkOverhead: 10,
				entryChunkMultiplicator: 2
			})).be.exactly(10);
		});
	});

	describe("checkConstraints", function() {
		it("throws an error", function() {
			should(function() {
				ChunkInstance.checkConstraints();
			}).not.throw(/checkConstraints/);
		});
	});

	describe("canBeIntegrated", function() {
		it("returns `false` if other object is initial", function() {
			var other = {
				isInitial: function() {
					return true
				}
			};
			should(ChunkInstance.canBeIntegrated(other)).be.false();
		});

		it("returns `true` if other object and chunk instance are NOT initial", function() {
			var other = {
				isInitial: function() {
					return false
				}
			};
			should(ChunkInstance.canBeIntegrated(other)).be.true();
		});
	});
});
