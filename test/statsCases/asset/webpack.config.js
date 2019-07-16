module.exports = {
	mode: "production",
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset"
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
