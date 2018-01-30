const webpack = require("../../../../lib/webpack");
const should = require("should");
const RemovedPluginError = require('../../../../lib/RemovedPluginError')

it("should error when accessing removed plugins", () => {
	should.throws(
		() => webpack.optimize.UglifyJsPlugin,
		RemovedPluginError,
		"webpack.optimize.UglifyJsPlugin has been removed, please use config.optimization.minimize instead."
	);

	should.throws(
		() => webpack.optimize.CommonsChunkPlugin,
		RemovedPluginError,
		"webpack.optimize.CommonsChunkPlugin has been removed, please use config.optimization.splitChunks instead."
	);
});
