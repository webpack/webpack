var webpack = require("../../../../");

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
