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
	}
];
