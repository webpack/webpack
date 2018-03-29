var webpack = require("../../../../");
module.exports = {
	module: {
		strictThisContextOnImports: true
	},
	plugins: [new webpack.optimize.ModuleConcatenationPlugin()]
};
