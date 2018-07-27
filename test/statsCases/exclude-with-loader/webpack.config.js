module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
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
				type: "javascript/auto"
			}
		]
	}
};
