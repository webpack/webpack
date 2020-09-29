/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		entry: "./index",
		mode: "production",
		target: "web",
		output: {
			filename: "warning.pro-web.js"
		}
	},
	{
		entry: "./index",
		mode: "production",
		target: "webworker",
		output: {
			filename: "warning.pro-webworker.js"
		}
	},
	{
		entry: "./index",
		mode: "production",
		target: "node",
		output: {
			filename: "no-warning.pro-node.js"
		}
	},
	{
		entry: "./index",
		mode: "development",
		target: "web",
		output: {
			filename: "no-warning.dev-web.js"
		}
	},
	{
		entry: "./index",
		mode: "development",
		target: "node",
		output: {
			filename: "no-warning.dev-node.js"
		}
	},
	{
		entry: "./index",
		mode: "development",
		target: "web",
		performance: {
			maxAssetSize: 100
		},
		output: {
			filename: "no-warning.dev-web-with-limit-set.js"
		}
	},
	{
		entry: "./index",
		mode: "production",
		target: "node",
		performance: {
			hints: "warning"
		},
		output: {
			filename: "warning.pro-node-with-hints-set.js"
		}
	}
];
