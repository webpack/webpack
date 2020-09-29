var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(
			/context-replacement.a$/,
			"new-context",
			true,
			/^replaced$/
		)
	]
};
