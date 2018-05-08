const webpack = require("../lib/webpack");
const RemovedPluginError = require("../lib/RemovedPluginError");

describe("removed plugin errors", () => {
	it("should error when accessing removed plugins", () => {
		expect(() => webpack.optimize.UglifyJsPlugin).toThrow(RemovedPluginError);
		expect(
			() => webpack.optimize.UglifyJsPlugin
		).toThrowErrorMatchingSnapshot();

		expect(() => webpack.optimize.CommonsChunkPlugin).toThrow(
			RemovedPluginError
		);
		expect(
			() => webpack.optimize.CommonsChunkPlugin
		).toThrowErrorMatchingSnapshot();
	});
});
