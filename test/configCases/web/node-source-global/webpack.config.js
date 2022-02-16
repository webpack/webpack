const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		global: true
	},
	plugins: [
		new DefinePlugin({
			"global.test": "'test'"
		})
	]
};
