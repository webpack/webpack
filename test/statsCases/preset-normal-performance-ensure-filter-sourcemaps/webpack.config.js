module.exports = {
	mode: "production",
	devtool: "sourcemap",
	performance: {
		hints: "warning"
	},
	entry: "./index",
	stats: {
		hash: false,
		colors: true
	}
};
