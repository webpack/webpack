var should = require("should");
var webpack = require("../lib/webpack");
var WebpackOptionsExtender = require("../lib/WebpackOptionsExtender");

describe("ConfigOptions", function() {
	describe("WebpackOptionsExtender", function() {
		it("should throw error if module not found", function() {
			(function() {
				new WebpackOptionsExtender().process({
					extend: [
						"./test/configOptions/extend/webpack.not-found.config.js"
					]
				});
			}).should.throw(Error, {
				code: 'MODULE_NOT_FOUND'
			});
		});

		it("should process options correctly", function() {
			var options = {
				extend: [
					"./test/configOptions/extend/webpack.3-0.config.js"
				]
			};

			new WebpackOptionsExtender().process(options);

			should.deepEqual(options, {
				debug: false,
				extend: [
					"./test/configOptions/extend/webpack.3-0.config.js"
				],
				plugins: [
					new webpack.optimize.UglifyJsPlugin(),
					new webpack.optimize.OccurrenceOrderPlugin(true)
				],
				resolve: {
					alias: {
						config: "./webpack.3-0.config.js"
					}
				},
				visited: [
					"webpack.1-1.config.js",
					"webpack.0.config.js",
					"webpack.2-0.config.js"
				]
			});
		});
	});
});
