module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		exclude: [
			"node_modules",
			"exclude"
		]
	},
	module: {
		loaders: [{
			test: /\.txt/,
			loader: "raw-loader"
		}]
	}
};
