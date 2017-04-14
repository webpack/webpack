const webpack = require("../../../../");
const path = require("path");

module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		'dist/banner': ["./index.js"],
		vendors: ["./vendors.js"]
	},
	output: {
		//path: path.join(__dirname, "dist"),
		filename: "[name].js?value"
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: "hash:[hash], chunkhash:[chunkhash], name:[name], filebase:[filebase], query:[query], basename:[basename]"
		})
	]
};
