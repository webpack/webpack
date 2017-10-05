var webpack = require("../../");

module.exports = {
	entry: {
		main: ["./example.js"]
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			name: "main",
			minChunks: 2,
			children: true,
			deepChildren: true,
		})
	]
};
