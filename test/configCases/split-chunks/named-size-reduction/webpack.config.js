"use strict";

// Both cache groups select e1, e2 and e3 at the same priority, so the size each
// split saves decides which one takes x. y is not in e3, so the named group only
// saves 50 * 2 + 1000 * 1 = 1100, less than the unnamed group's
// (50 + 700) * 2 = 1500. Counting y in all three chunks would overstate it as
// (50 + 1000) * 2 = 2100.

const assert = require("assert");
const path = require("path");

const sizeLoader = path.resolve(__dirname, "size-loader.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	entry: {
		e1: "./with-y",
		e2: "./with-y",
		e3: "./without-y"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js"
	},
	module: {
		rules: [
			{ test: /[\\/]x\.js$/, loader: sizeLoader, options: { size: 50 } },
			{ test: /[\\/]y\.js$/, loader: sizeLoader, options: { size: 1000 } },
			{ test: /[\\/]z\.js$/, loader: sizeLoader, options: { size: 700 } }
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
				named: { test: /[\\/][xy]\.js$/, name: "named" },
				unnamed: { test: /[\\/][xz]\.js$/ }
			}
		}
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("AssertNamedSizeReduction", (stats) => {
					const { chunkGraph, chunks, entrypoints, namedChunks } =
						stats.compilation;
					/**
					 * @param {import("../../../../").Chunk} chunk the chunk
					 * @returns {string[]} the file names of its modules
					 */
					const files = (chunk) =>
						chunkGraph
							.getChunkModules(chunk)
							.map((module) => path.basename(module.nameForCondition() || ""))
							.sort();
					const named = namedChunks.get("named");
					assert.ok(named);
					assert.deepStrictEqual(files(named), ["y.js"]);
					assert.deepStrictEqual(
						[...chunks]
							.map(files)
							.filter((chunkFiles) => chunkFiles.includes("x.js")),
						[["x.js", "z.js"]]
					);

					// e3 no longer loads y through the named chunk
					/**
					 * @param {string} name the entrypoint name
					 * @returns {boolean} whether it loads the named chunk
					 */
					const loadsNamed = (name) => {
						const entrypoint = entrypoints.get(name);
						assert.ok(entrypoint);
						return entrypoint.chunks.includes(named);
					};
					assert.ok(loadsNamed("e1"));
					assert.ok(loadsNamed("e2"));
					assert.ok(!loadsNamed("e3"));
				});
			}
		}
	]
};
