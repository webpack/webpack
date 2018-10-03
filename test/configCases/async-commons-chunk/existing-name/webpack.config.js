module.exports = {
	performance: {
		hints: false
	},
	optimization: {
		splitChunks: {
			minSize: 1,
			name: true
		},
		chunkIds: "named"
	}
};
