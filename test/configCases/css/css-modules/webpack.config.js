const webpack = require("../../../../");
const path = require("path");

/** @type {function(any, any): import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		target: "web",
		mode: "development",
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
	},
	{
		target: "web",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
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
		},
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 3,
				failOnConflict: true,
				fixedLength: true,
				test: m => m.type.startsWith("css")
			}),
			new webpack.experiments.ids.SyncModuleIdsPlugin({
				test: m => m.type.startsWith("css"),
				path: path.resolve(testPath, "module-ids.json"),
				mode: "create"
			})
		]
	}
];
