var webpack = require("../../../../");

module.exports = {
	performance: {
		hints: false
	},
	optimization: {
		splitChunks: {
			minSize: 1,
			name: true
		}
	},
	plugins: [new webpack.NamedChunksPlugin()]
};
