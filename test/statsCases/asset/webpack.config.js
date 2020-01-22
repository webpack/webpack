module.exports = {
	mode: "production",
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset"
			},
			{
				test: /\.html$/,
				type: "asset",
				generator: {
					filename: "static/[name][ext]"
				}
			}
		]
	},
	output: {
		filename: "bundle.js"
	},
	experiments: {
		asset: true
	}
};
