var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.optimize.MinChunkSizePlugin({
			minChunkSize: 30
		})
	]
};
