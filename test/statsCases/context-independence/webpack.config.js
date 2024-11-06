const path = require("path");

/**
 * @param {string} name name
 * @param {string} devtool devtool
 * @returns {import("../../../").Configuration} configuration
 */
const base = (name, devtool) => ({
	mode: "production",
	devtool,
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
	},
	entry: {
		main: {
			import: "./index",
			layer: "my-layer"
		}
	},
	context: path.resolve(__dirname, name),
	output: {
		path: path.resolve(
			__dirname,
			`../../js/stats/context-independence/${devtool}-${name}`
		),
		filename: "[name]-[chunkhash].js"
	},
	resolve: {
		alias: {
			c: [
				path.resolve(__dirname, name, "c"),
				path.resolve(__dirname, name, "cc")
			]
		}
	}
});

/** @type {import("../../../").Configuration[]} */
module.exports = [
	base("a", "source-map"),
	base("b", "source-map"),
	base("a", "eval-source-map"),
	base("b", "eval-source-map"),
	base("a", "eval"),
	base("b", "eval")
];
