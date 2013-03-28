var should = require("should");

var path = require("path");
var webpack = require("../lib/webpack");

describe("NodeTemplatePlugin", function() {

	it("should compile and run a simple module", function(done) {
		webpack({
			context: path.join(__dirname, "fixtures", "nodetest"),
			target: "node",
			output: {
				path: path.join(__dirname, "js"),
				filename: "result.js",
				chunkFilename: "[hash].result[id].js",
				libraryTarget: "commonjs2",
			},
			optimize: {
				minimize: true
			},
			entry: "./entry",

		}, function(err, stats) {
			if(err) return err;
			// console.log(stats.toString({colors: true}));
			stats.hasErrors().should.be.not.ok;
			stats.hasWarnings().should.be.not.ok;
			var result = require("./js/result");
			result.nextTick.should.be.equal(process.nextTick);
			result.fs.should.be.equal(require("fs"));
			result.loadChunk(456, function(chunk) {
				chunk.should.be.eql(123);
				var sameTick = true;
				result.loadChunk(567, function(chunk) {
					chunk.should.be.eql({a: 1});
					sameTick.should.be.eql(true);
					done();
				});
				sameTick = false;
			});
		});
	});

});
