/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /resource\.png$/,
				type: "asset/resource"
			},
			{
				test: /inline\.png$/,
				type: "asset/inline"
			},
			{
				test: /source\.text$/,
				type: "asset/source"
			},
			{
				mimetype: "text/html",
				type: "asset/resource"
			},
			{
				mimetype: "image/svg",
				type: "asset/resource"
			},
			{
				mimetype: "image/gif",
				type: "asset/resource"
			},
			{
				mimetype: "image/png",
				type: "asset/resource"
			}
		]
	},
	output: {
		assetModuleFilename: "[name][ext]"
	},
	externals: {
		"shared-external.png": "asset shared-external.png"
	}
};
