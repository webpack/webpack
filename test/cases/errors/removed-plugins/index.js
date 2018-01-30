const webpack = require("../../../../lib/webpack");
const should = require("should");

it("should error when accessing removed plugins", () => {
  should.throws(
    () => webpack.optimize.UglifyJsPlugin,
    Error,
    "webpack.optimize.UglifyJsPlugin has been removed, please use config.optimization.minimize instead."
  );

	should.throws(
    () => webpack.optimize.CommonsChunkPlugin,
    Error,
    "webpack.optimize.CommonsChunkPlugin has been removed, please use config.optimization.splitChunks instead."
  );
});
