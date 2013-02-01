var should = require("should");
var path = require("path");

var webpack = require("../lib/webpack");

describe("Integration", function() {
	it("should compile library1", function(done) {
		webpack({
			entry: "library1",
			context: path.join(__dirname, "browsertest"),
			output: {
				pathinfo: true,
				path: path.join(__dirname, "browsertest", "js"),
				filename: "library1.js",
				library: "library1"
			}
		}, function(err, stats) {
			if(err) throw err;
			stats.hasErrors().should.be.not.ok;
			stats.hasWarnings().should.be.not.ok;
			done();
		});
	});
	it("should compile library2", function(done) {
		webpack({
			entry: "library2",
			context: path.join(__dirname, "browsertest"),
			output: {
				pathinfo: true,
				path: path.join(__dirname, "browsertest", "js"),
				filename: "library2.js",
				publicPath: "js/",
				library: "library2"
			},
			module: {
				postLoaders: [
					{
						test: /extra2\.js/,
						loader: "raw!extra!val?cacheable"
					}
				]
			},
			optimize: {
				maxChunks: 2,
			},
			amd: {
				fromOptions: true
			},
			plugins: {
				"after-environment": function() {
					this.resolver.plugin("module-resolved", function(request, callback) {
						callback(null, request.replace(/extra\.js/, "extra2.js"));
					});
				}
			}
		}, function(err, stats) {
			if(err) throw err;
			stats.hasErrors().should.be.not.ok;
			stats.hasWarnings().should.be.not.ok;
			done();
		});
	});
});