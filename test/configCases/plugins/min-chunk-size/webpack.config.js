var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.optimize.MinChunkSizePlugin({
			minChunkSize: 30
		})
	]
};
