"use strict";

const path = require("node:path");
const { HotModuleReplacementPlugin } = require("../../");

// `webpack` resolves to this repo only because the example lives inside it;
// real projects can drop this alias and import `webpack/hot/*` directly.
/** @type {import("../../").Configuration} */
const base = {
	mode: "development",
	context: __dirname,
	devtool: false,
	resolve: { alias: { webpack: path.resolve(__dirname, "../../") } },
	plugins: [new HotModuleReplacementPlugin()]
};

/** @type {import("../../").Configuration[]} */
const config = [
	// Web — driven by webpack-dev-server (`webpack serve`).
	{
		...base,
		name: "web",
		target: "web",
		entry: "./web.js",
		output: { path: path.resolve(__dirname, "dist/web"), filename: "main.js" }
	},
	// Node — driven by webpack/hot/poll (`webpack --watch` + `node dist/node/main.js`).
	{
		...base,
		name: "node",
		target: "node",
		entry: "./node.js",
		output: { path: path.resolve(__dirname, "dist/node"), filename: "main.js" }
	},
	// Universal — single ESM bundle for web + Node, one dev-server client.
	{
		...base,
		name: "universal",
		target: ["web", "node"],
		entry: "./universal.js",
		experiments: { outputModule: true },
		output: {
			path: path.resolve(__dirname, "dist/universal"),
			filename: "main.mjs",
			module: true,
			chunkFormat: "module"
		}
	}
];

module.exports = config;
