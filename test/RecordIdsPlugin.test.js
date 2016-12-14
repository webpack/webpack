var should = require("should");

var path = require("path");
var webpack = require("../lib/webpack");

var RecordIdsPlugin = require("../lib/RecordIdsPlugin");

function makeRelative(compiler, identifier) {
	var context = compiler.context;
	return identifier.split("|").map(function(str) {
		return str.split("!").map(function(str) {
			return path.relative(context, str);
		}).join("!");
	}).join("|");
}

describe("RecordIdsPlugin", function() {

	var compiler;

	before(function() {
		compiler = webpack({
			entry: "./nodetest/entry",
			context: path.join(__dirname, "fixtures"),
			output: {
				path: path.join(__dirname, "nodetest", "js"),
				filename: "result1.js"
			}
		});

		compiler.plugin("compilation", function(compilation, callback) {
			compilation.plugin("should-record", function() {
				return true;
			});
		});
	});

	it("should cache identifiers", function(done) {
		compiler.compile(function(err, compilation) {
			if(err) done(err);
			var pass = true;
			for(var i = 0; i < compilation.modules.length; i++) {
				try {
					should.exist(compilation.modules[i].portableId);
					compilation.modules[i].portableId.should.equal(makeRelative(compiler, compilation.modules[i].identifier()));
				} catch(e) {
					done(e);
					pass = false;
					break;
				}
			}
			if(pass) done();
		});
	});
});
