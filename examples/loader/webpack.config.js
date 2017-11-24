module.exports = {
	mode: "production",
	module: {
		rules: [
			{ test: /\.css$/, loader: "css-loader" }
		]
	}
};
