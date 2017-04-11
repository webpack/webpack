var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		banner: ["./index.js"],
		vendors: ["./vendors.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: "hash:[hash:10], chunkhash:[chunkhash:10], name:[name], ext:[ext]"
		})
	]
};
