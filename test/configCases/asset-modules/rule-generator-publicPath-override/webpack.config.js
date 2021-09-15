/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	output: {
		assetModuleFilename: "file[ext]",
		publicPath: "assets/"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset",
				generator: {
					publicPath: ""
				}
			}
		]
	}
};
