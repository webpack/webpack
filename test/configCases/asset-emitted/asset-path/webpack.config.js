const path = require("path");

const base = {
	mode: "production",
	target: "node",
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/resource"
			}
		]
	},
	output: {
		filename: "[root]../bundle0.js",
		assetModuleFilename: "[root][path][name]-[hash][ext]"
	},
	resolve: {
		modules: [path.resolve(__dirname, "..", "..", "..", "fixtures")]
	},
	stats: {
		errorDetails: true
	}
};

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	base,
	{
		...base,
		output: {
			filename: "[root]../bundle1.js",
			assetModuleFilename: "some/dir/[root][path][name]-[hash][ext]"
		}
	}
];
