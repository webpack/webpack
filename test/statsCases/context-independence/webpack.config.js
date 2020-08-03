const path = require("path");

const base = {
	mode: "production",
	devtool: "source-map",
	entry: "./index",
	module: {
		rules: [
			{
				test: /chunk/,
				loader: "babel-loader",
				options: {}
			}
		]
	},
	stats: {
		relatedAssets: true
	}
};

const base2 = {
	...base,
	devtool: "eval-source-map"
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		...base,
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/context-independence/a"),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base,
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/context-independence/b"),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base2,
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/context-independence/eval-a"
			),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base2,
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/context-independence/eval-b"
			),
			filename: "[name]-[chunkhash].js"
		}
	}
];
