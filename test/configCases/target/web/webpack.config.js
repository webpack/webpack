module.exports = {
	target: "web",
	module: {
		loaders: [
			{ test: /\.json$/, loader: "json" }
		]
	}
};
