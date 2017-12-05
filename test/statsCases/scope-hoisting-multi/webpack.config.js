var webpack = require("../../../");
module.exports = [
	{
		mode: "production",
		entry: {
			vendor: "./vendor",
			first: "./first",
			second: "./second"
		},
		target: "web",
		output: {
			filename: "[name].js"
		},
		optimization: {
			concatenateModules: false
		},
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "vendor",
				minChunks: Infinity
			})
		],
		stats: {
			assets: false
		}
	},
	{
		mode: "production",
		entry: {
			vendor: "./vendor",
			first: "./first",
			second: "./second"
		},
		target: "web",
		output: {
			filename: "[name].js"
		},
		plugins: [
			new webpack.optimize.CommonsChunkPlugin({
				name: "vendor",
				minChunks: Infinity
			})
		],
		stats: {
			assets: false,
			optimizationBailout: true
		}
	}
];
