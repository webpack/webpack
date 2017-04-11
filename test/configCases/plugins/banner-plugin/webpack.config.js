var webpack = require("../../../../");
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		vendors: ["./vendors.js"]
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: "This is a value",
			exclude: ["vendors.js"]
		})
	]
};
