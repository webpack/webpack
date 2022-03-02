/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		excludeModules: ["node_modules", "exclude"],
		excludeAssets: [/\.json/]
	},
	module: {
		rules: [
			{
				test: /\.txt/,
				loader: "raw-loader"
			},
			{
				test: /\.json/,
				loader: "file-loader",
				options: {
					name: "[sha256:hash:8].[ext]"
				},
				type: "javascript/auto"
			}
		]
	}
};
