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
		rules: [{
			test: /\.txt/,
			loader: "raw-loader"
		}]
	}
};
