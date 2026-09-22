"use strict";

// Ported from rspack's `configCases/split-chunks/dedup-depth`.
//
// Each module belongs to {a,b} and four of the five c entries. Reaching {a,b}
// means intersecting all five chunk sets: round 1 combines two of them, round 2
// four, and only round 3 can leave every c entry behind. The intermediate
// intersections miss `minSize`, so their descendants have to be explored.

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const sharedSize = [0, 1, 2, 3, 4].reduce(
	(size, index) =>
		size + fs.statSync(path.join(__dirname, `m${index}.js`)).size,
	0
);

/** @type {{ usedExports: boolean, dedupDepth: number }[]} */
const variants = [];
// The harness evaluates this on the oldest Node the matrix runs, which has
// neither `Array.prototype.flatMap` nor `Object.fromEntries`
for (const usedExports of [false, true]) {
	for (const dedupDepth of [0, 1, 2, 3, 4, 0xffffffff]) {
		variants.push({ usedExports, dedupDepth });
	}
}

/**
 * The two entries sharing every module, plus the five each miss one of.
 * @returns {Record<string, string>} the entry option
 */
const makeEntry = () => {
	/** @type {Record<string, string>} */
	const entry = { a: "./a", b: "./b" };
	for (let i = 0; i < 5; i++) entry[`c${i}`] = `./c${i}`;
	return entry;
};

/** @type {import("../../../../").Configuration[]} */
module.exports = variants.map(({ usedExports, dedupDepth }, index) => ({
	name: `dedup-depth-${index}`,
	mode: "production",
	target: "node",
	entry: makeEntry(),
	output: {
		filename: `[name]-${index}.js`,
		chunkFilename: `[name]-${index}.js`
	},
	optimization: {
		minimize: false,
		concatenateModules: false,
		chunkIds: "named",
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
					const { chunkGraph, modules } = stats.compilation;
					const shared = [...modules].filter((module) =>
						/[\\/]m[0-4]\.js$/.test(module.identifier())
					);
					assert.strictEqual(shared.length, 5, `config ${index}`);
					const sharedChunks = shared.map((module) =>
						chunkGraph.getModuleChunks(module)
					);
					const extracted = dedupDepth >= 3;
					for (const chunks of sharedChunks) {
						assert.strictEqual(
							chunks.length,
							extracted ? 5 : 6,
							`config ${index}`
						);
					}
					const together = sharedChunks[0].filter((chunk) =>
						sharedChunks.every((chunks) => chunks.includes(chunk))
					);
					assert.strictEqual(
						together.length,
						extracted ? 1 : 2,
						`config ${index}`
					);
				});
			}
		}
	]
}));
