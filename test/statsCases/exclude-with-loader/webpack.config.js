module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		excludeModules: [
			"node_modules",
			"exclude"
		],
		excludeAssets: [
			/\.json/
		]
	},
	module: {
		loaders: [{
			test: /\.txt/,
			loader: "raw-loader"
		}, {
			test: /\.json/,
			loader: "file-loader"
		}]
	}
};
