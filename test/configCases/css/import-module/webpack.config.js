const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new webpack.HotModuleReplacementPlugin()],
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /stylesheet\.js$/i,
				use: ["./a-pitching-loader.js"],
				type: "asset/source"
			}
		]
	},
	experiments: {
		css: true
	}
};
