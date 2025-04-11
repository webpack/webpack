const webpack = require("../../../../");
const path = require("path");

/** @typedef {import("../../../WatchTestCases.template").Env} Env */
/** @typedef {import("../../../WatchTestCases.template").TestOptions} TestOptions */

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "web",
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
		}),
		new webpack.experiments.ids.SyncModuleIdsPlugin({
			test: m => m.type.startsWith("css"),
			path: path.resolve(testPath, "module-ids.json"),
			mode: "create"
		})
	]
});
