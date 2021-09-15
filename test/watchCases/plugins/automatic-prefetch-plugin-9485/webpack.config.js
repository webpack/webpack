const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /delayed/,
				use: path.resolve(__dirname, "./delayed")
			}
		]
	},
	plugins: [new webpack.AutomaticPrefetchPlugin()]
};
