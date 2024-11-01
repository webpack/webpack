/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "web",
		mode: "development",
		devtool: false,
		experiments: {
			css: true
		},
		output: {
			assetModuleFilename: "[name].[hash][ext][query][fragment]"
		}
	},
	{
		target: "web",
		mode: "development",
		devtool: false,
		experiments: {
			css: true
		},
		module: {
			parser: {
				css: {
					url: false
				}
			}
		},
		output: {
			assetModuleFilename: "[name].[hash][ext][query][fragment]"
		}
	}
];
