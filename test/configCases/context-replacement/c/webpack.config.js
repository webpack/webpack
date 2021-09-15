var path = require("path");
var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(
			/context-replacement.c$/,
			path.resolve(__dirname, "modules"),
			{
				a: "./a",
				b: "./module-b",
				"./c": "./module-b",
				d: "d",
				"./d": "d"
			}
		)
	]
};
