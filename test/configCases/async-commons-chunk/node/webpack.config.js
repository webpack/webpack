module.exports = {
	mode: "none",
	entry: {
		"foo/bar": "./"
	},
	target: "node",
	optimization: {
		namedChunks: true,
		namedModules: true
	}
};
