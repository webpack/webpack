const webpack = require("../../../../");
module.exports = {
	output: {
		libraryTarget: "amd",
		library: ({ chunk }) => chunk.name
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner: "function define(name, deps, fn) { fn(); }\n"
		})
	]
}
