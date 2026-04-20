"use strict";

const webpack = require("../../../../");

module.exports = {
	plugins: [
		new webpack.IgnorePlugin({
			resourceRegExp: /ignored-sub-module/,
			contextRegExp: /folder/
		})
	]
};
