const path = require("path");

/** @type {import("../../../").Configuration} */
const base = {
	mode: "production",
	entry: {
		index: {
			import: "./index",
			runtime: "runtime"
		},
		a: "./a",
		b: "./b"
	},
	module: {
		generator: {
			asset: {
				filename: "[hash][ext][query]"
			}
		},
		rules: [
			{
				test: /\.(png|jpg)$/,
				type: "asset/resource"
			}
		]
	},
	optimization: {
		minimize: true
	},
	stats: {
		relatedAssets: true,
		cachedAssets: true
	}
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "a-normal",
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/real-content-hash/a-normal"
			),
			filename: "[contenthash]-[contenthash:6].js"
		}
	},
	{
		...base,
		name: "b-normal",
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/real-content-hash/b-normal"
			),
			filename: "[contenthash]-[contenthash:6].js"
		}
	},
	{
		...base,
		context: path.resolve(__dirname, "a"),
		name: "a-source-map",
		devtool: "source-map",
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/real-content-hash/a-source-map"
			),
			filename: "[contenthash]-[contenthash:6].js"
		}
	},
	{
		...base,
		context: path.resolve(__dirname, "b"),
		name: "b-source-map",
		devtool: "source-map",
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/real-content-hash/b-source-map"
			),
			filename: "[contenthash]-[contenthash:6].js"
		}
	}
];
