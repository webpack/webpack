import { createRequire } from "module";

const require = createRequire(import.meta.url);

const cleverMergeModule =
	/** @type {import("../../../../lib/util/cleverMerge")} */
	(require("../../../../lib/util/cleverMerge.js"));

/** @typedef {Record<string, unknown>} ConfigLike */

/**
 * @returns {ConfigLike} a webpack-config-shaped object
 */
function createFirst() {
	return {
		mode: "development",
		devtool: "eval",
		module: {
			rules: [
				{ test: /\.js$/, use: "babel-loader" },
				{ test: /\.css$/, use: ["style-loader", "css-loader"] }
			]
		},
		resolve: {
			extensions: [".js", ".json"],
			alias: { "@": "/src", lib: "/lib" },
			byDependency: {
				esm: { mainFields: ["module", "main"] },
				commonjs: { mainFields: ["main"] }
			}
		},
		optimization: { minimize: false, splitChunks: { chunks: "async" } }
	};
}

/**
 * @returns {ConfigLike} an override-shaped object
 */
function createSecond() {
	return {
		mode: "production",
		module: {
			rules: [{ test: /\.ts$/, use: "ts-loader" }]
		},
		resolve: {
			extensions: [".ts", "..."],
			alias: { "@": "/source" }
		},
		optimization: { minimize: true }
	};
}

/** @type {ConfigLike} */
let firstStable = {};
/** @type {ConfigLike} */
let secondStable = {};
/** @type {unknown} */
let sink;

export default {
	name: "unit/util/cleverMerge",
	setup() {
		firstStable = createFirst();
		secondStable = createSecond();
	},
	teardown() {
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "cleverMerge 100 merges",
			fn() {
				// Uncached entry point — pays the full merge every call.
				for (let i = 0; i < 100; i++) {
					sink = cleverMergeModule.cleverMerge(firstStable, secondStable);
				}
			}
		},
		{
			name: "cachedCleverMerge 1000 hits",
			fn() {
				// Same object pair → WeakMap hit, the per-module hot path.
				for (let i = 0; i < 1000; i++) {
					sink = cleverMergeModule.cachedCleverMerge(firstStable, secondStable);
				}
			}
		}
	]
};
