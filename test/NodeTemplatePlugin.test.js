"use strict";

const path = require("path");
const webpack = require("..");

describe("NodeTemplatePlugin", () => {
	jest.setTimeout(20000);
	it("should compile and run a simple module", done => {
		webpack(
			{
				mode: "production",
				context: path.join(__dirname, "fixtures", "nodetest"),
				target: "node",
				output: {
					path: path.join(__dirname, "js", "NodeTemplatePlugin"),
					filename: "result.js",
					chunkFilename: "[fullhash].result.[id].js",
					library: "abc",
					libraryTarget: "commonjs"
				},
				entry: "./entry"
			},
			(err, stats) => {
				if (err) return err;
				expect(stats.hasErrors()).toBe(false);
				expect(stats.hasWarnings()).toBe(false);
				// eslint-disable-next-line node/no-missing-require
				const result = require("./js/NodeTemplatePlugin/result").abc;
				expect(result.nextTick).toBe(process.nextTick);
				expect(result.fs).toBe(require("fs"));
				result.loadChunk(456, chunk => {
					expect(chunk).toBe(123);
					result.loadChunk(567, chunk => {
						expect(chunk).toEqual({
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
					path: path.join(__dirname, "js", "NodeTemplatePluginSingle"),
					filename: "result2.js",
					chunkFilename: "[fullhash].result2.[id].js",
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
				expect(stats.hasErrors()).toBe(false);
				// eslint-disable-next-line node/no-missing-require
				const result = require("./js/NodeTemplatePluginSingle/result2");
				expect(result.nextTick).toBe(process.nextTick);
				expect(result.fs).toBe(require("fs"));
				const sameTick = true;
				result.loadChunk(456, chunk => {
					expect(chunk).toBe(123);
					expect(sameTick).toBe(true);
					result.loadChunk(567, chunk => {
						expect(chunk).toEqual({
							a: 1
						});
						done();
					});
				});
			}
		);
	});
});
