var DefinePlugin = require("../../../../").DefinePlugin;

module.exports = {
	output: {
		ecmaVersion: 11
	},
	plugins: [
		new DefinePlugin({
			BIGINT: 9007199254740991n,
			ZERO_BIGINT: 0n
		})
	]
};
