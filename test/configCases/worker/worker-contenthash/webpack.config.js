module.exports = {
	entry: {
		main: {
			import: "./index.js",
			filename: "[name].js"
		}
	},
	output: {
		filename: "[name]-[contenthash].js"
	}
};
