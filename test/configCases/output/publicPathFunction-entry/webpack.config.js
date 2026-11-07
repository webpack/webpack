/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "web",
	entry: {
		a: "./a",
		b: "./b"
	},
	output: {
		filename: "[name].js",
		publicPathFunction:
			"function(path, publicPath) { return '/global/' + path; }",
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.jpg$/,
				type: "asset/resource"
			}
		]
	}
};
