module.exports = {
	module: {
		loaders: [
			{ test: /\.coffee$/, loader: "coffee" }
		]
	},
	resolve: {
		extensions: [".web.coffee", ".web.js", ".coffee", ".js"]
	}
}