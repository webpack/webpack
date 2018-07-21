var webpack = require("../../../../");
module.exports = {
	plugins: [
		new webpack.NamedModulesPlugin(),
		new webpack.optimize.ModuleConcatenationPlugin()
	]
};
