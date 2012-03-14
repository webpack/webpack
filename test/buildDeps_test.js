/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var vows = require("vows");
var assert = require("assert");
var path = require("path");
var buildDeps = require("../lib/buildDeps");

vows.describe("buildDeps").addBatch({
	"main1": {
		topic: function() {
			buildDeps(path.join(__dirname, "fixtures"), "./main1.js", this.callback);
		},

		"all modules loaded": function(depTree) {
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "main1.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "b.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "a.js")], null);
		},

		"one chunk": function(depTree) {
			assert.deepEqual(Object.keys(depTree.chunks), ["0"]);
			for(var i in depTree.modulesById) {
				assert.deepEqual(depTree.modulesById[i].chunks, [0]);
			}
		}
	},

	"main2": {
		topic: function() {
			buildDeps(path.join(__dirname, "fixtures"), "./main2.js", {}, this.callback);
		},

		"all modules loaded": function(depTree) {
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "main2.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "b.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "a.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "b.js")], null);
		},

		"two chunks": function(depTree) {
			assert.deepEqual(Object.keys(depTree.chunks), ["0", "1"]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "main2.js")].chunks, [0]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].chunks, [0]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "b.js")].chunks, [0]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "a.js")].chunks, [1]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "node_modules", "m1", "b.js")].chunks, [1]);
		}
	},

	"main3": {
		topic: function() {
			buildDeps(path.join(__dirname, "fixtures"), "./main3.js", {}, this.callback);
		},

		"all modules loaded": function(depTree) {
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "main3.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")], null);
			assert.notEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "c.js")], null);
		},

		"two chunks": function(depTree) {
			assert.deepEqual(Object.keys(depTree.chunks), ["0", "1"]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "main3.js")].chunks, [0]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].chunks, [0, 1]);
			assert.deepEqual(depTree.modulesByFile[path.join(__dirname, "fixtures", "c.js")].chunks, [1]);
			var main3id = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "main3.js")].id;
			var aid = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "a.js")].id;
			var cid = ""+depTree.modulesByFile[path.join(__dirname, "fixtures", "c.js")].id;
			assert.deepEqual(Object.keys(depTree.chunks[0].modules), [main3id, aid]);
			assert.deepEqual(Object.keys(depTree.chunks[1].modules), [cid, aid]);
			assert.deepEqual(depTree.chunks[0].modules[main3id], "include");
			assert.deepEqual(depTree.chunks[0].modules[aid], "include");
			assert.deepEqual(depTree.chunks[1].modules[aid], "in-parent");
			assert.deepEqual(depTree.chunks[1].modules[cid], "include");
		}

	}

}).export(module);