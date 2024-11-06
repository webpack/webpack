/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				oneOf: [
					{
						use: ["./style-loader", "./css-loader"],
						issuer: /\.(js)$/
					},
					{
						type: "asset/resource",
						issuer: /\.(css|scss|sass)$/
					}
				]
			}
		]
	}
};
