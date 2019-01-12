jest.resetModules();
jest.mock('util', () => ({
	deprecate: jest.fn((...args) => {
		console.warn(...args);
	})
}));

const util = require('util');
const AggressiveSplittingPlugin = require("../../../lib/optimize/AggressiveSplittingPlugin");

// const spy = jest.spyOn(util, 'deprecate').mockImplementationOnce();
const aggressiveSplitting = new AggressiveSplittingPlugin({
	minSize: 1500,
	maxSize: 2500
});
setImmediate(() => {
	expect(util.deprecate).toHaveBeenCalledTimes(1);
})
// expect(util.deprecate).toHaveBeenCalledTimes(1);
// util.deprecate.mockRestore();
module.exports = {
	mode: "production",
	entry: "./index",
	cache: true, // AggressiveSplittingPlugin rebuilds multiple times, we need to cache the assets
	output: {
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [aggressiveSplitting],
	recordsInputPath: __dirname + "/input-records.json",
	stats: {
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
};
