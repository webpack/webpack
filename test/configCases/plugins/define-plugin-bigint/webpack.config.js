var DefinePlugin = require("../../../../").DefinePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		ecmaVersion: 11
	},
	plugins: [
		new DefinePlugin({
			BIGINT: BigInt("9007199254740993"),
			ZERO_BIGINT: BigInt(0)
		})
	]
};
