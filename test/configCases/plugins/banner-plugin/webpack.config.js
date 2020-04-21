var webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
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
		new webpack.BannerPlugin("banner is a string"),
		new webpack.BannerPlugin(() => "banner is a function"),
		new webpack.BannerPlugin({
			banner: "A test value",
			exclude: ["vendors.js"]
		}),
		new webpack.BannerPlugin({
			banner: ({ chunk }) => `multiline\nbanner\n${chunk.name}`
		}),
		new webpack.BannerPlugin(
			"trim trailing whitespace\t \n\ntrailing whitespace "
		),
		new webpack.BannerPlugin(
			"trim trailing whitespace\t \n\nno trailing whitespace"
		)
	]
};
