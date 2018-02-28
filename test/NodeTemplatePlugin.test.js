/* global describe, it */
"use strict";

require("should");

const path = require("path");
const webpack = require("../lib/webpack");

describe("NodeTemplatePlugin", () => {
	it("should compile and run a simple module", done => {
		webpack(
			{
				mode: "production",
				context: path.join(__dirname, "fixtures", "nodetest"),
				target: "node",
				output: {
					path: path.join(__dirname, "js"),
					filename: "result.js",
					chunkFilename: "[hash].result.[id].js",
					library: "abc",
					libraryTarget: "commonjs"
				},
				entry: "./entry"
			},
			(err, stats) => {
				if (err) return err;
				stats.hasErrors().should.be.not.ok();
				stats.hasWarnings().should.be.not.ok();
				// eslint-disable-next-line node/no-missing-require
				const result = require("./js/result").abc;
				result.nextTick.should.be.equal(process.nextTick);
				result.fs.should.be.equal(require("fs"));
				result.loadChunk(456, chunk => {
					chunk.should.be.eql(123);
					result.loadChunk(567, chunk => {
						chunk.should.be.eql({
							a: 1
						});
						done();
					});
				});
			}
		);
	});

	it("should compile and run a simple module in single mode", done => {
		webpack(
			{
				mode: "production",
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
					})
				]
			},
			(err, stats) => {
				if (err) return err;
				stats.hasErrors().should.be.not.ok();
				// eslint-disable-next-line node/no-missing-require
				const result = require("./js/result2");
				result.nextTick.should.be.equal(process.nextTick);
				result.fs.should.be.equal(require("fs"));
				const sameTick = true;
				result.loadChunk(456, chunk => {
					chunk.should.be.eql(123);
					sameTick.should.be.eql(true);
					result.loadChunk(567, chunk => {
						chunk.should.be.eql({
							a: 1
						});
						done();
					});
				});
			}
		);
	});
});
