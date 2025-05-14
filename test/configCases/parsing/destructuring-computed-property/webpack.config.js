const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	plugins: [
		new webpack.DefinePlugin({
			PROPERTY: JSON.stringify("foo")
		})
	]
};
