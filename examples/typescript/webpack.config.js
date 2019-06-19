module.exports = {
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js", ".json"]
	}
};
