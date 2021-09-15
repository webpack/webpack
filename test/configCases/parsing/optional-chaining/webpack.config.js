const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "web",
	plugins: [
		new DefinePlugin({
			_VALUE_: {
				_DEFINED_: 1,
				_PROP_: {
					_DEFINED_: 2
				}
			}
		})
	]
};
