var path = require("path");

/** @type {function(any, any): import("../../../../types").Configuration} */
module.exports = (env, { testPath }) => ({
	target: "node14",
	output: {
		chunkLoading: "import"
	},
	resolve: {
		alias: {
			library: path.resolve(testPath, "../0-create-library/lib.js")
		}
	},
	experiments: {
		topLevelAwait: true,
		outputModule: true
	}
});
