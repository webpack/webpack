module.exports = {
	mode: "production",
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "url/experimental"
			}
		]
	},
	output: {
		filename: "bundle.js"
	}
};
