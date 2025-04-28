const DefinePlugin = require("../../../../").DefinePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"foo.bar.baz": '"test"'
		})
	]
};
