"use strict";

require("./helpers/warmup-webpack");

const path = require("node:path");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

// cspell:word nodetest
expectNoDeprecations();

describe("NodeTemplatePlugin", () => {
	it("should compile and run a simple module", (done) => {
		const webpack = require("..");

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
				expect(/** @type {import("../").Stats} */ (stats).hasErrors()).toBe(
					false
				);
				expect(/** @type {import("../").Stats} */ (stats).hasWarnings()).toBe(
					false
				);

				// @ts-expect-error generated file does not exist at type-check time
				const result = require("./js/NodeTemplatePlugin/result").abc;

				expect(result.nextTick).toBe(process.nextTick);
				expect(result.fs).toBe(require("node:fs"));
				result.loadChunk(
					456,
					/** @param {unknown} chunk loaded chunk */ (chunk) => {
						expect(chunk).toBe(123);
						result.loadChunk(
							567,
							/** @param {unknown} chunk loaded chunk */ (chunk) => {
								expect(chunk).toEqual({
									a: 1
								});
								done();
							}
						);
					}
				);
			}
		);
	});

	it("should compile and run a simple module in single mode", (done) => {
		const webpack = require("..");

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
				expect(/** @type {import("../").Stats} */ (stats).hasErrors()).toBe(
					false
				);

				// @ts-expect-error generated file does not exist at type-check time
				const result = require("./js/NodeTemplatePluginSingle/result2");

				expect(result.nextTick).toBe(process.nextTick);
				expect(result.fs).toBe(require("node:fs"));
				const sameTick = true;
				result.loadChunk(
					456,
					/** @param {unknown} chunk loaded chunk */ (chunk) => {
						expect(chunk).toBe(123);
						expect(sameTick).toBe(true);
						result.loadChunk(
							567,
							/** @param {unknown} chunk loaded chunk */ (chunk) => {
								expect(chunk).toEqual({
									a: 1
								});
								done();
							}
						);
					}
				);
			}
		);
	});
});
