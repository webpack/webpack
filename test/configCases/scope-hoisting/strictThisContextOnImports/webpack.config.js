var webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		strictThisContextOnImports: true
	},
	plugins: [new webpack.optimize.ModuleConcatenationPlugin()]
};
