"use strict";

const path = require("node:path");

const nodeMajor = process.versions.node.split(".")[0];

/** @type {import("../../../../").ModuleOptions["rules"]} */
const rules = [
	{ test: /\.txt$/, type: "asset/source" },
	{ test: /\.svg$/, type: "asset/inline" },
	{ test: /\.png$/, type: "asset/resource" },
	{ test: /\.bin$/, type: "asset/bytes" },
	{
		test: /\.dat$/,
		type: "asset",
		parser: { dataUrlCondition: { maxSize: Infinity } },
		generator: { dataUrl: { mimetype: "text/plain" } }
	},
	{ test: /\.wat$/, loader: "wast-loader", type: "webassembly/async" },
	{ test: /\.module\.css$/, type: "css/module" },
	{ test: /\.global\.css$/, type: "css/global" }
];

/** @type {NonNullable<import("../../../../").Configuration["experiments"]>} */
const experiments = {
	outputModule: true,
	asyncWebAssembly: true,
	topLevelAwait: true,
	deferImport: true,
	sourceImport: true,
	css: true,
	html: true
};

/** @type {import("../../../../").Configuration["externals"]} */
const externals = {
	// resolvable on both web and node so the universal bundle runs everywhere
	"ext-var": "var (40 + 2)",
	"ext-source": "var 1 + 2",
	// keep `worker.js` portable: only the node branch imports it at runtime
	worker_threads: "module worker_threads"
};

/**
 * @param {string} name config name
 * @param {string | string[]} target target
 * @param {string} testPath output base path
 * @returns {import("../../../../").Configuration} configuration
 */
const config = (name, target, testPath) => ({
	name,
	target,
	mode: "development",
	devtool: false,
	output: {
		path: path.join(testPath, name),
		module: true,
		filename: "main.mjs",
		chunkFilename: "[name].mjs",
		webassemblyModuleFilename: "[hash].wasm",
		assetModuleFilename: "[hash][ext]"
	},
	module: { rules },
	experiments,
	externals
});

/** @type {(env: EXPECTED_ANY, options: { testPath: string }) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	config("node", `node${nodeMajor}`, testPath),
	config("web", ["web", "es2020"], testPath),
	config("universal", "universal", testPath)
];
