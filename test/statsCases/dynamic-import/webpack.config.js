/** @type {import("../../../").Configuration} */
module.exports = {
	devtool: false,
	mode: "development",
	module: {
		rules: [
			{
				exclude: /node_modules/,
				test: /\.[cm]?js$/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [["@babel/preset-react", { runtime: "automatic" }]],
						sourceType: "unambiguous"
					}
				}
			}
		]
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: { chunks: "all", name: "common" }
	}
};
