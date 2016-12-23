module.exports = {
	target: "webworker",
	performance: {
		hints: false
	},
	module: {
		loaders: [
			{ test: /\.json$/, loader: "json-loader" }
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
