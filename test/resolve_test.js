/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var vows = require("vows");
var assert = require("assert");
var path = require("path");
var resolve = require("../lib/resolve");

var fixtures = path.join(__dirname, "fixtures");
function testResolve(context, moduleName, result) {
	return {
		topic: function() {
			resolve(context, moduleName, {}, this.callback);
		},

		"correct filename": function(filename) {
			assert.equal(filename, result);
		}
	}
}
function testResolveContext(context, moduleName, result) {
	return {
		topic: function() {
			resolve.context(context, moduleName, {}, this.callback);
		},

		"correct filename": function(filename) {
			assert.equal(filename, result);
		}
	}
}
vows.describe("resolve").addBatch({

	"resolve simple 1": testResolve(fixtures, "./main1.js", path.join(fixtures, "main1.js")),
	"resolve simple 2": testResolve(fixtures, "./main1", path.join(fixtures, "main1.js")),
	"resolve simple 3": testResolve(fixtures, "./a.js", path.join(fixtures, "a.js")),
	"resolve simple 4": testResolve(fixtures, "./a", path.join(fixtures, "a.js")),
	"resolve module 1": testResolve(fixtures, "m1/a.js", path.join(fixtures, "node_modules", "m1", "a.js")),
	"resolve module 2": testResolve(fixtures, "m1/a", path.join(fixtures, "node_modules", "m1", "a.js")),
	"resolve complex 1": testResolve(fixtures, "complexm/step1", path.join(fixtures, "node_modules", "complexm", "step1.js")),
	"resolve complex 2": testResolve(path.join(fixtures, "node_modules", "complexm", "web_modules", "m1"),
										"m2/b.js", path.join(fixtures, "node_modules", "m2", "b.js")),
	"resolve loader 1": testResolve(fixtures, "m1/a!./main1.js", path.join(fixtures, "node_modules", "m1", "a.js") + "!" + path.join(fixtures, "main1.js")),
	"resolve loader context 1": testResolveContext(fixtures, "m1/a!./", path.join(fixtures, "node_modules", "m1", "a.js") + "!" + fixtures),


}).export(module);