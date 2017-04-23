"use strict";

const path = require("path");

const webpack = require("../lib/webpack");

describe("Integration", function() {
	it("should compile library1", (done) => {
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
		}, (err, stats) => {
			if(err) throw err;
			expect(stats.hasErrors()).not.toBeTruthy;
			expect(stats.hasWarnings()).not.toBeTruthy;
			done();
		});
	});
	it("should compile library2", (done) => {
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
				rules: [{
					test: /extra2\.js/,
					loader: "raw!extra!val?cacheable",
					enforce: "post"
				}]
			},
			amd: {
				fromOptions: true
			},
			plugins: [
				new webpack.optimize.LimitChunkCountPlugin({
					maxChunks: 1
				}),
				new webpack.DefinePlugin({
					"typeof CONST_TYPEOF": JSON.stringify("typeof"),
					CONST_TRUE: true,
					CONST_FALSE: false,
					CONST_FUNCTION: function() {
						return "ok";
					},
					CONST_NUMBER: 123,
					CONST_NUMBER_EXPR: "1*100+23",
					CONST_OBJECT: {
						A: 1,
						B: JSON.stringify("B"),
						C: function() {
							return "C";
						}
					}
				}),
				function() {
					this.plugin("normal-module-factory", (nmf) => {
						nmf.plugin("after-resolve", (data, callback) => {
							data.resource = data.resource.replace(/extra\.js/, "extra2.js");
							setTimeout(() => callback(null, data), 50);
						});
					});
				}
			]
		}, (err, stats) => {
			if(err) throw err;
			expect(stats.hasErrors()).not.toBeTruthy;
			expect(stats.hasWarnings()).not.toBeTruthy;
			done();
		});
	});
}, 5000);
