const path = require("path");
const webpack = require("../../../../");

/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		context: path.join(__dirname, "../css-modules"),
		entry: "../css-modules-in-node/index.js",
		target: "node",
		mode: "development",
		experiments: {
			css: true
		}
	},
	{
		context: path.join(__dirname, "../css-modules"),
		entry: "../css-modules-in-node/index.js",
		target: "node",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
		experiments: {
			css: true
		},
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 3,
				failOnConflict: true,
				fixedLength: true,
				test: m => m.type.startsWith("css")
			})
		]
	},
	{
		context: path.join(__dirname, "../css-modules"),
		entry: "../css-modules-in-node/index.js",
		target: "node",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
		experiments: {
			css: true
		},
		plugins: [
			new webpack.experiments.ids.SyncModuleIdsPlugin({
				test: m => m.type.startsWith("css"),
				path: path.resolve(testPath, "../css-modules/module-ids.json"),
				mode: "read"
			})
		]
	}
];
