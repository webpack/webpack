var should = require("should");
var path = require("path");

var webpack = require("../lib/webpack");

describe("Integration", function() {
	this.timeout(5000);
	it("should compile library1", function(done) {
		webpack({
			entry: "library1",
			bail: true,
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
			bail: true,
			module: {
				postLoaders: [
					{
						test: /extra2\.js/,
						loader: "raw!extra!val?cacheable"
					}
				]
			},
			amd: {
				fromOptions: true
			},
			resolve: {
				// cannot resolve should outside the outermost node_modules
				// so it is injected here
				alias: { should: require.resolve("should") }
			},
			plugins: [
				new webpack.optimize.LimitChunkCountPlugin(1),
				new webpack.DefinePlugin({
					CONST_TRUE: true,
					CONST_FALSE: false,
					CONST_FUNCTION: function() { return "ok"; },
					CONST_NUMBER: 123,
					CONST_NUMBER_EXPR: "1*100+23",
					CONST_OBJECT: {
						A: 1,
						B: JSON.stringify("B"),
						C: function() { return "C"; }
					}
				}),
				function() {
					this.plugin("after-environment", function() {
						this.resolver.plugin("module-resolved", function(request, callback) {
							callback(null, request.replace(/extra\.js/, "extra2.js"));
						});
					});
				}
			]
		}, function(err, stats) {
			if(err) throw err;
			stats.hasErrors().should.be.not.ok;
			stats.hasWarnings().should.be.not.ok;
			done();
		});
	});
});