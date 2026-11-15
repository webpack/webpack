"use strict";

const assert = require("assert");
const path = require("path");

const sizeLoader = path.resolve(__dirname, "size-loader.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	entry: {
		e1: "./e1",
		e2: "./e2",
		e3: "./e3"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	module: {
		rules: [
			{ test: /[\\/]a\.js$/, loader: sizeLoader, options: { size: 300 } },
			{ test: /[\\/]b\.js$/, loader: sizeLoader, options: { size: 1000 } },
			{ test: /[\\/]c\.js$/, loader: sizeLoader, options: { size: 600 } },
			{ test: /[\\/]d\.js$/, loader: sizeLoader, options: { size: 200 } },
			{ test: /[\\/]f\.js$/, loader: sizeLoader, options: { size: 100 } }
		]
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			minChunks: 2,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				unnamed: { test: /[\\/][ac]\.js$/ },
				g: { test: /[\\/][abf]\.js$/, name: "g" },
				h: { test: /[\\/][bd]\.js$/, name: "h" }
			}
		}
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap(
					"AssertNamedSizeReductionAfterSplit",
					(stats) => {
						const { chunkGraph, chunks, namedChunks } = stats.compilation;
						/**
						 * @param {import("../../../../").Chunk} chunk the chunk
						 * @returns {string[]} the file names of its modules
						 */
						const files = (chunk) =>
							chunkGraph
								.getChunkModules(chunk)
								.map((module) => path.basename(module.nameForCondition() || ""))
								.sort();
						const g = namedChunks.get("g");
						const h = namedChunks.get("h");
						assert.ok(g);
						assert.ok(h);
						assert.deepStrictEqual(files(g), ["f.js"]);
						assert.deepStrictEqual(files(h), ["b.js", "d.js"]);
						assert.deepStrictEqual(
							[...chunks]
								.map(files)
								.filter((chunkFiles) => chunkFiles.includes("a.js")),
							[["a.js", "c.js"]]
						);
					}
				);
			}
		}
	]
};
