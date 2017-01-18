var webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.ContextReplacementPlugin(/context-replacement.b$/, /^\.\/only/)
	]
};
