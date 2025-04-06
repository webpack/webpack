// webpack.config.js
const path = require("path");

module.exports = {
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /\.js$/,
				use: path.resolve(__dirname, "error-loader.js")
			}
		]
	},
	mode: "development"
};
