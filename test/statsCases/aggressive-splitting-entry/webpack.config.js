// jest.resetModules();
// jest.mock('util', () => ({
// 		deprecate: jest.fn((...args) => {
// 			console.error(...args);
// 		})
// 	}));
// const util = require('util');
// const deprecateSpy = jest.spyOn(util, 'deprecate');
// const deprecateSpy = jest.spyOn(util, 'deprecate').mockImplementationOnce();
const AggressiveSplittingPlugin = require("../../../lib/optimize/AggressiveSplittingPlugin");

module.exports = ["fitting", "content-change"].map(type => {
	// console.log(AggressiveSplittingPlugin)
	const aggressiveSplitting = new AggressiveSplittingPlugin({
		chunkOverhead: 0,
		entryChunkMultiplicator: 1,
		minSize: 1500,
		maxSize: 2500
	});
	// console.log(util.deprecate)
	// expect(util.deprecate).toHaveBeenCalledTimes(1);
	// // util.deprecate.mockReset();

	return {
		name: type,
		mode: "production",
		cache: true, // AggressiveSplittingPlugin rebuilds multiple times, we need to cache the assets
		entry: "./index",
		output: {
			filename: "[chunkhash].js",
			chunkFilename: "[chunkhash].js"
		},
		plugins: [aggressiveSplitting],
		recordsInputPath: __dirname + `/input-records-${type}.json`,
		//recordsOutputPath: __dirname + `/records-${type}.json`,
		stats: {
			chunks: true,
			chunkModules: true,
			chunkOrigins: true,
			entrypoints: true,
			modules: false,
			publicPath: true
		}
	};
});

// util.deprecate.mockRestore();
