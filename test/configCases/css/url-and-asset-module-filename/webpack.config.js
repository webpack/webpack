/** @type {import("../../../../").Configuration} */
const common = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		...common,
		output: {
			publicPath: "auto",
			cssChunkFilename: "bundle0/css/[name].css",
			assetModuleFilename: "bundle0/assets/[name][ext]"
		}
	},
	{
		...common,
		output: {
			publicPath: "https://test.cases/path/",
			cssChunkFilename: "bundle1/css/[name].css",
			assetModuleFilename: "bundle1/assets/[name][ext]"
		}
	},
	{
		...common,
		output: {
			cssChunkFilename: "bundle2/css/[name].css"
		},
		module: {
			rules: [
				{
					test: /\.png$/i,
					type: "asset/resource",
					generator: {
						filename: "[name][ext]",
						outputPath: "bundle2/assets/",
						publicPath: "https://test.cases/path/bundle2/assets/"
					}
				}
			]
		}
	}
];
