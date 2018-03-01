var path = require("path");
var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(
			/context-replacement/,
			path.resolve(__dirname, "modules"),
			{
				a: "./module-b"
			}
		)
	]
};
