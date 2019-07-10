var webpack = require("../../../../");

module.exports = {
	mode: "development",
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			append: "\n//# sourceMappingURL=[url]?hash=[hash]"
		})
	]
};
