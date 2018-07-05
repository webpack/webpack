module.exports = {
	target: "webworker",
	performance: {
		hints: false
	},
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		minimize: false
	}
};
