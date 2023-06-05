var DefinePlugin = require("../../../../").DefinePlugin;

/** @type {import("../../../../").Configuration[]} */
module.exports = {
	plugins: [
		null,
		undefined,
		new DefinePlugin({
			TRUE: true
		})
	]
};
