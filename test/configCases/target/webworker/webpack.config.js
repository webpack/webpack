module.exports = {
	target: "webworker",
	module: {
		loaders: [
			{ test: /\.json$/, loader: "json-loader" }
		]
	},
	node: {
		__dirname: false,
		__filename: false
	},
};