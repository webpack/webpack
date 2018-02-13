const webpack = require("../lib/webpack");
const RemovedPluginError = require("../lib/RemovedPluginError");
require("should");

describe("removed plugin errors", () => {
	it("should error when accessing removed plugins", () => {
		(() => webpack.optimize.UglifyJsPlugin).should.throw(
			RemovedPluginError,
			/webpack\.optimize\.UglifyJsPlugin has been removed, please use config\.optimization\.minimize instead\./
		);

		(() => webpack.optimize.CommonsChunkPlugin).should.throw(
			RemovedPluginError,
			/webpack\.optimize\.CommonsChunkPlugin has been removed, please use config\.optimization\.splitChunks instead\./
		);
	});
});
