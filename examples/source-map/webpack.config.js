module.exports = env => {
	return {
		mode: env,
		entry: "./example.coffee",
		devtool: env === "development" ? "cheap-eval-source-map" : "source-map",
		module: {
			rules: [{ test: /\.coffee$/, use: "coffee-loader" }]
		}
	};
};
