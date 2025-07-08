const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(
			/replacement.a$/,
			"new-context",
			true,
			/^replaced$/
		)
	]
};
