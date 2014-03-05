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
				chunkFilename: "[hash].result.[id].js",
				library: "abc",
				libraryTarget: "commonjs",
			},
			entry: "./entry",
			plugins: [
				new webpack.optimize.UglifyJsPlugin()
			]
		}, function(err, stats) {
			if(err) return err;
			stats.hasErrors().should.be.not.ok;
			stats.hasWarnings().should.be.not.ok;
			var result = require("./js/result").abc;
			result.nextTick.should.be.equal(process.nextTick);
			result.fs.should.be.equal(require("fs"));
			result.loadChunk(456, function(chunk) {
				chunk.should.be.eql(123);
				result.loadChunk(567, function(chunk) {
					chunk.should.be.eql({a: 1});
					done();
				});
			});
		});
	});

	it("should compile and run a simple module in single mode", function(done) {
		webpack({
			context: path.join(__dirname, "fixtures", "nodetest"),
			target: "node",
			output: {
				path: path.join(__dirname, "js"),
				filename: "result2.js",
				chunkFilename: "[hash].result2.[id].js",
				library: "def",
				libraryTarget: "umd",
			},
			entry: "./entry",
			plugins: [
				new webpack.optimize.LimitChunkCountPlugin(1),
				new webpack.optimize.UglifyJsPlugin()
			]
		}, function(err, stats) {
			if(err) return err;
			stats.hasErrors().should.be.not.ok;
			var result = require("./js/result2");
			result.nextTick.should.be.equal(process.nextTick);
			result.fs.should.be.equal(require("fs"));
			var sameTick = true;
			result.loadChunk(456, function(chunk) {
				chunk.should.be.eql(123);
				sameTick.should.be.eql(true);
				result.loadChunk(567, function(chunk) {
					chunk.should.be.eql({a: 1});
					done();
				});
			});
		});
	});

});
