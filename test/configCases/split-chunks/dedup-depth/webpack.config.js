"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sharedSize = [0, 1, 2, 3, 4].reduce(
	(sum, i) => sum + fs.statSync(path.join(__dirname, `m${i}.js`)).size,
	0
);

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true]
	.flatMap((usedExports) =>
		[0, 1, 2, 3, 4, 0xffffffff].map((dedupDepth) => ({
			usedExports,
			dedupDepth
		}))
	)
	.map(({ usedExports, dedupDepth }, index) => ({
		mode: "production",
		target: "node",
		entry: {
			a: "./a",
			b: "./b",
			...Object.fromEntries(
				Array.from({ length: 5 }, (_, i) => [`c${i}`, `./c${i}`])
			)
		},
		output: {
			filename: `[name]-${index}.js`,
			chunkFilename: `[name]-${index}.js`
		},
		optimization: {
			minimize: false,
			concatenateModules: false,
			splitChunks: {
				chunks: "all",
				usedExports,
				dedupDepth,
				minSize: sharedSize,
				minSizeReduction: 0,
				maxInitialRequests: Infinity,
				maxAsyncRequests: Infinity,
				cacheGroups: {
					default: false,
					defaultVendors: false,
					shared: { test: /[\\/]m[0-4]\.js$/, minChunks: 2 }
				}
			}
		},
		plugins: [
			{
				apply(compiler) {
					compiler.hooks.done.tap("AssertDedupDepth", (stats) => {
						const { modules, chunkGraph } = stats.compilation;
						const shared = [...modules]
							.filter((module) => {
								const name = module.nameForCondition();
								return name !== null && /[\\/]m[0-4]\.js$/.test(name);
							})
							.map((module) => ({
								chunks: chunkGraph.getModuleChunks(module)
							}));
						assert.equal(shared.length, 5);
						const extracted = dedupDepth >= 3;
						for (const module of shared) {
							assert.equal(module.chunks.length, extracted ? 5 : 6);
						}
						const common = shared[0].chunks.filter((chunk) =>
							shared.every((module) => module.chunks.includes(chunk))
						);
						assert.equal(common.length, extracted ? 1 : 2);
					});
				}
			}
		]
	}));
