const path = require("path");

const base = {
	mode: "production",
	entry: "./index",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.(png|jpg)$/,
				type: "asset/resource"
			}
		]
	},
	optimization: {
		runtimeChunk: true,
		minimize: true
	},
	stats: {
		relatedAssets: true
	},
	experiments: {
		asset: true
	}
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		...base,
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/real-content-hash/a"),
			filename: "[contenthash]-[contenthash:6].js"
		}
	},
	{
		...base,
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/real-content-hash/b"),
			filename: "[contenthash]-[contenthash:6].js"
		}
	}
];
