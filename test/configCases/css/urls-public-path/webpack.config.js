/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		assetModuleFilename: "assets/file[ext]",
		publicPath: ""
	},
	module: {
		rules: [
			{
				test: /\.png$/i,
				type: "asset/resource",
				generator: {
					publicPath: () => {
						return "/custom/path/to/";
					}
				}
			}
		]
	}
};
