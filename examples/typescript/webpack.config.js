const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = (env = "development") => ({
	mode: env,
	entry: {
		output: "./index.ts"
	},
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
	},
	plugins: [new ForkTsCheckerWebpackPlugin({ async: env === "production" })]
});
