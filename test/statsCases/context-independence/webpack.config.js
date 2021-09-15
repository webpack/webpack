const path = require("path");

const base = {
	mode: "production",
	devtool: "source-map",
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
	},
	experiments: {
		layers: true
	}
};

const base2 = {
	...base,
	devtool: "eval-source-map"
};

const base3 = {
	...base,
	devtool: "eval"
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		...base,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "a")
			}
		},
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/context-independence/a"),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "b")
			}
		},
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(__dirname, "../../js/stats/context-independence/b"),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base2,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "a")
			}
		},
		context: path.resolve(__dirname, "a"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/context-independence/eval-source-map-a"
			),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base2,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "b")
			}
		},
		context: path.resolve(__dirname, "b"),
		output: {
			path: path.resolve(
				__dirname,
				"../../js/stats/context-independence/eval-source-map-b"
			),
			filename: "[name]-[chunkhash].js"
		}
	},
	{
		...base3,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "a")
			}
		},
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
		...base3,
		entry: {
			main: {
				import: "./index",
				layer: path.resolve(__dirname, "b")
			}
		},
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
