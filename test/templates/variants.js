"use strict";

const path = require("path");
const webpack = require("../..");

/** @typedef {import("./TestCases").SuiteConfig} SuiteConfig */

const repositoryRoot = path.join(__dirname, "..", "..");

// Every option set `cases/` is run under, so what varies between the suites
// reads side by side. Each entry has one file in test/ naming it, because jest
// parallelizes per file rather than per describe.
/** @type {Record<string, SuiteConfig>} */
const testCases = {
	normal: { name: "normal" },
	development: { name: "development", mode: "development", devtool: false },
	production: { name: "production", mode: "production", minimize: true },
	"production-global-used": {
		name: "production with usedExports global",
		mode: "production",
		optimization: { usedExports: "global", minimize: false }
	},
	module: { name: "module", target: "node14", module: true },
	hot: {
		name: "hot",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	},
	"devtool-eval": { name: "devtool-eval", devtool: "eval" },
	"devtool-eval-source-map": {
		name: "devtool-eval-source-map",
		devtool: "eval-source-map"
	},
	"devtool-eval-cheap-source-map": {
		name: "devtool-eval-cheap-source-map",
		devtool: "eval-cheap-source-map"
	},
	"devtool-eval-cheap-module-source-map": {
		name: "devtool-eval-cheap-module-source-map",
		devtool: "eval-cheap-module-source-map"
	},
	"devtool-eval-named-modules": {
		name: "devtool-eval-named-modules",
		devtool: "eval",
		optimization: { moduleIds: "named", chunkIds: "named" }
	},
	"devtool-eval-deterministic-module-ids": {
		name: "devtool-eval-deterministic-module-ids",
		devtool: "eval",
		optimization: { moduleIds: "deterministic" }
	},
	"devtool-source-map": { name: "devtool-source-map", devtool: "source-map" },
	"devtool-cheap-source-map": {
		name: "devtool-cheap-source-map",
		devtool: "cheap-source-map"
	},
	"devtool-inline-source-map": {
		name: "devtool-inline-source-map",
		devtool: "inline-source-map"
	},
	"devtool-inline-cheap-source-map": {
		name: "devtool-inline-cheap-source-map",
		devtool: "inline-cheap-source-map"
	},
	"minimized-source-map": {
		name: "minimized-source-map",
		mode: "production",
		devtool: "eval-cheap-module-source-map",
		minimize: true
	},
	"cache-pack": {
		name: "cache pack",
		cache: {
			type: "filesystem",
			buildDependencies: { defaultWebpack: [] }
		},
		snapshot: {
			managedPaths: [path.resolve(repositoryRoot, "node_modules")]
		},
		optimization: {
			innerGraph: true,
			usedExports: true,
			concatenateModules: true
		}
	},
	"all-combined": /** @type {EXPECTED_ANY} */ ({
		name: "all-combined",
		mode: "production",
		devtool: "source-map",
		minimize: true,
		optimization: { moduleIds: "named", chunkIds: "named" },
		plugins: [
			/** @param {import("../..").Compiler} compiler compiler */
			(compiler) => {
				new webpack.HotModuleReplacementPlugin().apply(compiler);
			}
		]
	})
};

// The targets `hotCases/` is run against — see lib/config/defaults.js for how
// each one picks its chunk-loading runtime.
/** @type {Record<string, { name: string, target: string | string[] }>} */
const hotTestCases = {
	web: { name: "web", target: "web" },
	webworker: { name: "webworker", target: "webworker" },
	node: { name: "node", target: "node" },
	"async-node": { name: "async-node", target: "async-node" },
	universal: { name: "universal", target: ["web", "node"] }
};

module.exports = { hotTestCases, testCases };
