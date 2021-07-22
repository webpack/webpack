const MiniCssPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a.js",
		b: { import: "./b.js", dependOn: "a" }
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: MiniCssPlugin.loader
			}
		]
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				styles: {
					type: "css/mini-extract",
					enforce: true
				}
			}
		}
	},
	target: "web",
	plugins: [
		new MiniCssPlugin({
			experimentalUseImportModule: true
		})
	]
};
