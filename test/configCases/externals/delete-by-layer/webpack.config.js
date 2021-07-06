const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: {
			import: "./b",
			layer: "someLayer"
		}
	},
	output: {
		filename: "[name].js"
	},
	externals: {
		external: ["Array", "isArray"],
		byLayer: {
			someLayer: {
				"...": webpack.util.DELETE
			}
		}
	},
	experiments: {
		layers: true
	}
};
