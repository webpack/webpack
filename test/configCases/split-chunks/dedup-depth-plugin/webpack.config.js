"use strict";

// Ported from rspack's `configCases/split-chunks/dedup-depth-plugin`: a plugin
// constructed by hand reads no defaults, so it resolves the depth itself — from
// `futureDefaults`, where rspack reads the mode. The fixtures are the ones the
// intersection suite next door builds on.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { optimize } = require("../../../../");

const { SplitChunksPlugin } = optimize;

const context = path.resolve(__dirname, "../intersections-min-size");
const sharedSize = [0, 1, 2].reduce(
	(size, index) => size + fs.statSync(path.join(context, `m${index}.js`)).size,
	0
);

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ futureDefaults: true, defaultDepth: 1 },
	{ futureDefaults: false, defaultDepth: 0 }
]
	.flatMap(({ futureDefaults, defaultDepth }) =>
		[undefined, 0, 1, 2].map((dedupDepth) => ({
			futureDefaults,
			dedupDepth,
			expectedDepth: dedupDepth === undefined ? defaultDepth : dedupDepth
		}))
	)
	.map(({ futureDefaults, dedupDepth, expectedDepth }, index) => ({
		name: `dedup-depth-plugin-${index}`,
		context,
		mode: /** @type {const} */ ("production"),
		// The suite runs the bundle as a script, so the module output the next
		// major's defaults would bring stays off
		experiments: { futureDefaults, outputModule: false },
		target: "node",
		entry: { a: "./a", b: "./b", c: "./c0", d: "./c1", e: "./c2" },
		output: {
			module: false,
			filename: `[name]-${index}.js`,
			chunkFilename: `[name]-${index}.js`
		},
		optimization: {
			minimize: false,
			concatenateModules: false,
			chunkIds: "named",
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
						const { chunkGraph, modules } = stats.compilation;
						const shared = [...modules].filter((module) =>
							/[\\/]m[012]\.js$/.test(module.identifier())
						);
						assert.strictEqual(shared.length, 3, `config ${index}`);
						const sharedChunks = shared.map((module) =>
							chunkGraph.getModuleChunks(module)
						);
						for (const chunks of sharedChunks) {
							assert.strictEqual(
								chunks.length,
								expectedDepth > 0 ? 2 : 3,
								`config ${index}`
							);
						}
						const together = sharedChunks[0].filter((chunk) =>
							sharedChunks.every((chunks) => chunks.includes(chunk))
						);
						assert.strictEqual(
							together.length,
							expectedDepth > 0 ? 1 : 2,
							`config ${index}`
						);
					});
				}
			}
		]
	}));
