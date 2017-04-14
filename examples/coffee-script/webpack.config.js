module.exports = {
	module: {
		loaders: [
			{ test: /\.coffee$/, loader: "coffee-loader" }
		]
	},
	resolve: {
		extensions: [".web.coffee", ".web.js", ".coffee", ".js"]
	}
};
