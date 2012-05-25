/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var should = require("should");
var path = require("path");
var resolve = require("../lib/resolve");

var fixtures = path.join(__dirname, "fixtures");
function testResolve(name, context, moduleName, result) {
	describe(name, function() {
		it("should resolve correctly", function(done) {
			resolve(context, moduleName, {}, function(err, filename) {
				if(err) done(err);
				should.exist(filename);
				filename.should.equal(result);
				done();
			});
		});
	});
}
function testResolveContext(name, context, moduleName, result) {
	describe(name, function() {
		it("should resolve correctly", function(done) {
			resolve.context(context, moduleName, {}, function(err, filename) {
				if(err) done(err);
				should.exist(filename)
				filename.should.equal(result);
				done();
			});
		});
	});
}
describe("resolve", function() {
	testResolve("file with .js",
		fixtures, "./main1.js", path.join(fixtures, "main1.js"));
	testResolve("file without extension",
		fixtures, "./main1", path.join(fixtures, "main1.js"));
	testResolve("another file with .js",
		fixtures, "./a.js", path.join(fixtures, "a.js"));
	testResolve("another file without extension",
		fixtures, "./a", path.join(fixtures, "a.js"));
	testResolve("file in module with .js",
		fixtures, "m1/a.js", path.join(fixtures, "node_modules", "m1", "a.js"));
	testResolve("file in module without extension",
		fixtures, "m1/a", path.join(fixtures, "node_modules", "m1", "a.js"));
	testResolve("another file in module without extension",
		fixtures, "complexm/step1", path.join(fixtures, "node_modules", "complexm", "step1.js"));
	testResolve("from submodule to file in sibling module",
		path.join(fixtures, "node_modules", "complexm"), "m2/b.js", path.join(fixtures, "node_modules", "m2", "b.js"));
	testResolve("from submodule to file in sibling of parent module",
		path.join(fixtures, "node_modules", "complexm", "web_modules", "m1"), "m2/b.js", path.join(fixtures, "node_modules", "m2", "b.js"));

	testResolve("loader",
		fixtures, "m1/a!./main1.js", path.join(fixtures, "node_modules", "m1", "a.js") + "!" + path.join(fixtures, "main1.js"));
	testResolve("loader with prefix",
		fixtures, "m2/b!./main1.js", path.join(fixtures, "node_modules", "m2-loader", "b.js") + "!" + path.join(fixtures, "main1.js"));
	testResolve("multiple loaders",
		fixtures, "m1/a!m1/b!m2/b!./main1.js", path.join(fixtures, "node_modules", "m1", "a.js") + "!" +
			path.join(fixtures, "node_modules", "m1", "b.js") + "!" +
			path.join(fixtures, "node_modules", "m2-loader", "b.js") + "!" +
			path.join(fixtures, "main1.js"));

	testResolveContext("context for fixtures",
		fixtures, "./", fixtures);
	testResolveContext("context for fixtures/lib",
		fixtures, "./lib", path.join(fixtures, "lib"));
	testResolveContext("context with loader",
		fixtures, "m1/a!./", path.join(fixtures, "node_modules", "m1", "a.js") + "!" + fixtures);
	testResolveContext("context with loaders in parent directory",
		fixtures, "m1/a!m2/b.js!../", path.join(fixtures, "node_modules", "m1", "a.js") + "!" +
			path.join(fixtures, "node_modules", "m2-loader", "b.js") + "!" +
			path.join(fixtures, ".."));
});