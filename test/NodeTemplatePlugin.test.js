"use strict";

const path = require("path");
const webpack = require("../lib/webpack");

describe("NodeTemplatePlugin", () => {

	it("should compile and run a simple module", (done) => {
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
		}, (err, stats) => {
			if(err) return err;
			expect(stats.hasErrors()).not.toBeTruthy();
			expect(stats.hasWarnings()).not.toBeTruthy();
			const result = require("./js/result").abc;
			expect(result.nextTick).toEqual(process.nextTick);
			expect(result.fs).toEqual(require("fs"));
			result.loadChunk(456, (chunk) => {
				expect(chunk).toEqual(123);
				result.loadChunk(567, (chunk) => {
					expect(chunk).toEqual({
						a: 1
					});
					done();
				});
			});
		});
	});

	it("should compile and run a simple module in single mode", (done) => {
		webpack({
			context: path.join(__dirname, "fixtures", "nodetest"),
			target: "node",
			output: {
				path: path.join(__dirname, "js"),
				filename: "result2.js",
				chunkFilename: "[hash].result2.[id].js",
				library: "def",
				libraryTarget: "umd",
				auxiliaryComment: "test"
			},
			entry: "./entry",
			plugins: [
				new webpack.optimize.LimitChunkCountPlugin({
					maxChunks: 1
				}),
				new webpack.optimize.UglifyJsPlugin()
			]
		}, (err, stats) => {
			if(err) return err;
			expect(stats.hasErrors()).not.toBeTruthy();
			const result = require("./js/result2");
			expect(result.nextTick).toEqual(process.nextTick);
			expect(result.fs).toEqual(require("fs"));
			const sameTick = true;
			result.loadChunk(456, (chunk) => {
				expect(chunk).toEqual(123);
				expect(sameTick).toEqual(true);
				result.loadChunk(567, (chunk) => {
					expect(chunk).toEqual({
						a: 1
					});
					done();
				});
			});
		});
	});

});
