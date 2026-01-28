"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
const base = {
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.my-css$/i,
				type: "css/auto"
			},
			{
				test: /\.invalid$/i,
				type: "css/auto"
			}
		]
	}
};

// target: ["web", "node"]
// output module

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		...base,
		name: "web-development",
		target: "web",
		mode: "development",
		output: {
			uniqueName: "my-app"
		},
		node: {
			__dirname: false,
			__filename: false
		}
	},
	{
		...base,
		name: "web-production",
		target: "web",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
		node: {
			__dirname: false,
			__filename: false
		},
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 3,
				failOnConflict: true,
				fixedLength: true,
				test: (m) => m.type.startsWith("css")
			}),
			new webpack.experiments.ids.SyncModuleIdsPlugin({
				test: (m) => m.type.startsWith("css"),
				path: path.resolve(testPath, "module-ids.json"),
				mode: "create"
			})
		]
	},
	{
		...base,
		dependencies: ["web-development"],
		name: "node-development",
		target: "node",
		mode: "development",
		output: {
			uniqueName: "my-app"
		}
	},
	{
		...base,
		dependencies: ["web-production"],
		name: "node-production",
		target: "node",
		mode: "production",
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 3,
				failOnConflict: true,
				fixedLength: true,
				test: (m) => m.type.startsWith("css")
			}),
			new webpack.experiments.ids.SyncModuleIdsPlugin({
				test: (m) => m.type.startsWith("css"),
				path: path.resolve(testPath, "module-ids.json"),
				mode: "read"
			})
		]
	},
	// CSS modules `css/global`
	{
		entry: "./index-global.js",
		name: "web-development-global",
		target: "web",
		mode: "development",
		experiments: {
			css: true
		},
		module: {
			rules: [
				{
					test: /\.css$/i,
					type: "css/global"
				},
				{
					test: /\.my-css$/i,
					type: "css/global"
				},
				{
					test: /\.invalid$/i,
					type: "css/global"
				}
			]
		},
		output: {
			uniqueName: "my-app"
		},
		node: {
			__dirname: false,
			__filename: false
		}
	},
	{
		entry: "./index-global.js",
		name: "web-production-global",
		target: "web",
		mode: "production",
		experiments: {
			css: true
		},
		module: {
			rules: [
				{
					test: /\.css$/i,
					type: "css/global"
				},
				{
					test: /\.my-css$/i,
					type: "css/global"
				},
				{
					test: /\.invalid$/i,
					type: "css/global"
				}
			]
		},
		output: {
			uniqueName: "my-app"
		},
		node: {
			__dirname: false,
			__filename: false
		}
	},
	// CSS modules options
	{
		...base,
		entry: "./index-options.js",
		name: "web-development",
		target: "web",
		mode: "development",
		output: {
			uniqueName: "my-app"
		},
		module: {
			parser: {
				"css/auto": {
					animation: false,
					customIdents: false,
					dashedIdents: false,
					container: false,
					function: false,
					grid: false
				}
			}
		},
		node: {
			__dirname: false,
			__filename: false
		}
	}
];
