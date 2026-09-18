"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { optimize } = require("../../../../");

const sharedSize = [0, 1, 2].reduce(
	(sum, i) =>
		sum +
		fs.statSync(path.join(__dirname, `../intersections-min-size/m${i}.js`))
			.size,
	0
);
const { SplitChunksPlugin } = optimize;

const context = path.resolve(__dirname, "../intersections-min-size");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ mode: "production", defaultDepth: 1 },
	{ mode: "development", defaultDepth: 0 },
	{ mode: "none", defaultDepth: 0 },
	{ mode: undefined, defaultDepth: 1 }
]
	.flatMap(({ mode, defaultDepth }) =>
		[undefined, 0, 1, 2].map((dedupDepth) => ({
			mode,
			dedupDepth,
			expectedDepth: dedupDepth === undefined ? defaultDepth : dedupDepth
		}))
	)
	.map(({ mode, dedupDepth, expectedDepth }, index) => ({
		context,
		mode,
		target: "node",
		entry: { a: "./a", b: "./b", c: "./c0", d: "./c1", e: "./c2" },
		output: {
			filename: `[name]-${index}.js`,
			chunkFilename: `[name]-${index}.js`
		},
		optimization: {
			minimize: false,
			concatenateModules: false,
			splitChunks: false
		},
		plugins: [
			new SplitChunksPlugin({
				chunks: "all",
				dedupDepth,
				minSize: sharedSize,
				maxInitialRequests: Infinity,
				maxAsyncRequests: Infinity,
				cacheGroups: { shared: { test: /[\\/]m[012]\.js$/, minChunks: 2 } }
			}),
			{
				apply(compiler) {
					compiler.hooks.done.tap("AssertPluginDedupDepth", (stats) => {
						const { modules, chunkGraph } = stats.compilation;
						const shared = [...modules]
							.filter((module) => {
								const name = module.nameForCondition();
								return name !== null && /[\\/]m[012]\.js$/.test(name);
							})
							.map((module) => ({
								chunks: chunkGraph.getModuleChunks(module)
							}));
						assert.equal(shared.length, 3);
						for (const module of shared) {
							assert.equal(module.chunks.length, expectedDepth > 0 ? 2 : 3);
						}
						const common = shared[0].chunks.filter((chunk) =>
							shared.every((module) => module.chunks.includes(chunk))
						);
						assert.equal(common.length, expectedDepth > 0 ? 1 : 2);
					});
				}
			}
		]
	}));
