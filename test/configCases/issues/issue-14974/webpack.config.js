const { HotModuleReplacementPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	experiments: { topLevelAwait: true },
	optimization: { usedExports: false, sideEffects: false },
	plugins: [new HotModuleReplacementPlugin()]
};
