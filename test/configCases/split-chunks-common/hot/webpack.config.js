var HotModuleReplacementPlugin = require("../../../../")
	.HotModuleReplacementPlugin;
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendor: {
					chunks: "all",
					name: "vendor",
					test: /vendor/,
					enforce: true
				}
			}
		}
	},
	plugins: [new HotModuleReplacementPlugin()]
};
