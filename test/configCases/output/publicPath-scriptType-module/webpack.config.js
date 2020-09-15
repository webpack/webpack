/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	target: "electron-renderer",
	output: {
		assetModuleFilename: "[name][ext]",
		importFunctionName: "pseudoImport",
		scriptType: "module",
		filename: "index.mjs"
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
