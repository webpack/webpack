/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var should = require("should");
var path = require("path");
var buildDeps = require("../lib/buildDeps");

describe("buildDeps", function() {
	describe("of main1", function() {
		var depTree;
		before(function(done) {
			buildDeps(path.join(__dirname, "fixtures"), "./main1.js", function(err, tree) {
				if(err) return done(err);
				should.exist(tree);
				depTree = tree;
				done();
			});
		});

		it("should compile", function() {
			depTree.should.have.property("modulesByFile").and.be.a("object");
			depTree.should.have.property("modules").and.be.a("object");
			depTree.should.have.property("chunks").and.be.a("object");
		});

		it("should have all modules loaded", function() {
			depTree.modulesByFile.should.have.keys([
				path.join(__dirname, "fixtures", "main1.js"),
				path.join(__dirname, "fixtures", "a.js"),
				path.join(__dirname, "fixtures", "b.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "a.js")
			]);
		});

		it("should be one chunk", function() {
			depTree.chunks.should.have.keys(["main"]);
			for(var i in depTree.modulesById) {
				depTree.modulesById[i].should.have.property("chunks", ["main"]);
			}
		});
	});

	describe("of main2", function() {
		var depTree;
		before(function(done) {
			buildDeps(path.join(__dirname, "fixtures"), "./main2.js", function(err, tree) {
				if(err) return done(err);
				should.not.exist(err);
				should.exist(tree);
				depTree = tree;
				done();
			});
		});

		it("should compile", function() {
			depTree.should.have.property("modulesByFile").and.be.a("object");
			depTree.should.have.property("modules").and.be.a("object");
			depTree.should.have.property("chunks").and.be.a("object");
		});

		it("should have all modules loaded", function() {
			depTree.modulesByFile.should.have.keys([
				path.join(__dirname, "fixtures", "main2.js"),
				path.join(__dirname, "fixtures", "a.js"),
				path.join(__dirname, "fixtures", "b.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "a.js"),
				path.join(__dirname, "fixtures", "node_modules", "m1", "b.js")
			]);
		});

		it("should be two chunks", function() {
			depTree.chunks.should.have.keys(["1", "main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "main2.js")].chunks.should.be.eql(["main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].chunks.should.be.eql(["main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "b.js")].chunks.should.be.eql(["main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "a.js")].chunks.should.be.eql([1]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "b.js")].chunks.should.be.eql([1]);
		});
	});

	describe("of main3", function() {
		var depTree;
		before(function(done) {
			buildDeps(path.join(__dirname, "fixtures"), "./main3.js", function(err, tree) {
				if(err) return done(err);
				should.not.exist(err);
				should.exist(tree);
				depTree = tree;
				done();
			});
		});

		it("should compile", function() {
			depTree.should.have.property("modulesByFile").and.be.a("object");
			depTree.should.have.property("modules").and.be.a("object");
			depTree.should.have.property("chunks").and.be.a("object");
		});

		it("should have all modules loaded", function() {
			depTree.modulesByFile.should.have.keys([
				path.join(__dirname, "fixtures", "main3.js"),
				path.join(__dirname, "fixtures", "a.js"),
				path.join(__dirname, "fixtures", "c.js")
			]);
		});

		it("should be two chunks", function() {
			depTree.chunks.should.have.keys(["1", "main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "main3.js")].chunks.should.be.eql(["main"]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].chunks.should.be.eql(["main", 1]);
			depTree.modulesByFile[path.join(__dirname, "fixtures", "c.js")].chunks.should.be.eql([1]);
		});

		it("should have correct chucks", function() {
			var main3id = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "main3.js")].id;
			var aid = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].id;
			var cid = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "c.js")].id;
			depTree.chunks.should.have.property("main").have.property("modules");
			depTree.chunks.should.have.property("1").have.property("modules");
			depTree.chunks.main.modules.should.have.keys([main3id, aid]);
			depTree.chunks[1].modules.should.have.keys([cid, aid]);
			depTree.chunks.main.modules[main3id].should.be.equal("include");
			depTree.chunks.main.modules[aid].should.be.equal("include");
			depTree.chunks[1].modules[aid].should.be.equal("in-parent");
			depTree.chunks[1].modules[cid].should.be.equal("include");
		});
	});

	describe("of main4", function() {
		var depTree;
		before(function(done) {
			buildDeps(path.join(__dirname, "fixtures"), "./main4.js", {
				maxChunks: 5
			}, function(err, tree) {
				if(err) return done(err);
				should.not.exist(err);
				should.exist(tree);
				depTree = tree;
				done();
			});
		});

		it("should have 5 chunks", function() {
			depTree.chunkCount.should.be.eql(5);
		});

	});
});